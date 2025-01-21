import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject, catchError, interval, map, NEVER, take } from 'rxjs';
import { Plan, Scenario, ScenarioResult, ScenarioResultStatus } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../plan-helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { PlanStateService, ScenarioService } from '@services';
import { SNACK_ERROR_CONFIG } from '@shared';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { FeatureService } from '../../features/feature.service';
import { GoalOverlayService } from './goal-overlay/goal-overlay.service';
import { ChartData } from '../project-areas-metrics/chart-data';
import { MetricsService } from '@services/metrics.service';
import { processScenarioResultsToChartData } from '../scenario-helpers';
import { TreatmentsService } from '@services/treatments.service';
import { canAddTreatmentPlan } from '../permissions';
import { MatDialog } from '@angular/material/dialog';
import { CreateTreatmentDialogComponent } from './create-treatment-dialog/create-treatment-dialog.component';
import { AnalyticsService } from '@services/analytics.service';

enum ScenarioTabs {
  CONFIG,
  RESULTS,
}

@UntilDestroy()
@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
})
export class CreateScenariosComponent implements OnInit {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;
  selectedTab = ScenarioTabs.CONFIG;
  generatingScenario: boolean = false;
  scenarioId: string | null = null;
  scenarioName: string | null = null;
  planId?: number | null;
  plan$ = new BehaviorSubject<Plan | null>(null);
  acres$ = this.plan$.pipe(map((plan) => (plan ? plan.area_acres : 0)));
  existingScenarioNames: string[] = [];
  forms: FormGroup = this.fb.group({});

  project_area_upload_enabled = this.featureService.isFeatureEnabled(
    'upload_project_area'
  );

  // this value gets updated once we load the scenario result.
  scenarioState: ScenarioResultStatus = 'NOT_STARTED';
  scenarioResults: ScenarioResult | null = null;
  priorities: string[] = [];
  scenarioChartData: ChartData[] = [];
  tabAnimationOptions: Record<'on' | 'off', string> = {
    on: '500ms',
    off: '0ms',
  };

  tabAnimation = this.tabAnimationOptions.off;

  scenarioNotFound = false;

  @ViewChild(SetPrioritiesComponent, { static: true })
  prioritiesComponent!: SetPrioritiesComponent;

  @ViewChild(ConstraintsPanelComponent, { static: true })
  constraintsPanelComponent!: ConstraintsPanelComponent;

  creatingTreatment = false;

  constructor(
    private fb: FormBuilder,
    private planStateService: PlanStateService,
    private scenarioService: ScenarioService,
    private router: Router,
    private route: ActivatedRoute,
    private matSnackBar: MatSnackBar,
    private featureService: FeatureService,
    private goalOverlayService: GoalOverlayService,
    private metricsService: MetricsService,
    private treatmentsService: TreatmentsService,
    private dialog: MatDialog,
    private analyticsService: AnalyticsService
  ) {}

  createForms() {
    this.forms = this.fb.group({
      scenarioName: new FormControl('', [
        Validators.required,
        (control: AbstractControl) =>
          scenarioNameMustBeNew(control, this.existingScenarioNames),
      ]),
      priorities: this.prioritiesComponent.createForm(),
      constrains: this.constraintsPanelComponent.createForm(),
      projectAreas: this.fb.group({
        generateAreas: [''],
        uploadedArea: [''],
      }),
    });
  }

  ngOnInit(): void {
    this.createForms();
    // Get plan details and current config ID from plan state, then load the config.
    this.planStateService.planState$
      .pipe(untilDestroyed(this), take(1))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioId = planState.currentScenarioId;
        this.planId = planState.currentPlanId;
        if (this.plan$.getValue()?.region_name) {
          this.planStateService.setPlanRegion(
            this.plan$.getValue()?.region_name!
          );
        }
      });

    if (this.scenarioId) {
      // Has to be outside service subscription or else will cause infinite loop
      this.scenarioState = 'LOADING';
      this.loadConfig();
      this.pollForChanges();
      // if we have an id go to the results tab.
      this.selectedTab = ScenarioTabs.RESULTS;
    } else {
      // enable animation
      this.tabAnimation = this.tabAnimationOptions.on;
    }

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.projectAreasForm?.valueChanges.subscribe((_) => {
      const generateAreas = this.forms
        .get('projectAreas')
        ?.get('generateAreas');
      const uploadedArea = this.projectAreasForm?.get('uploadedArea');
      if (generateAreas?.value) {
        this.drawShapes(null);
      } else {
        this.drawShapes(uploadedArea?.value);
      }
    });

    if (typeof this.planId === 'number') {
      this.scenarioService
        .getScenariosForPlan(this.planId)
        .pipe(take(1))
        .subscribe((scenarios) => {
          this.existingScenarioNames = scenarios.map((s) => s.name);
        });
    }
  }

  pollForChanges() {
    interval(POLLING_INTERVAL)
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        // only poll when scenario is pending or running
        if (
          this.scenarioState === 'PENDING' ||
          this.scenarioState === 'RUNNING'
        ) {
          this.loadConfig();
        }
      });
  }

  loadConfig(): void {
    this.planStateService.getScenario(this.scenarioId!).subscribe({
      next: (scenario: Scenario) => {
        // if we have the same state do nothing.
        if (this.scenarioState === scenario.scenario_result?.status) {
          return;
        }

        // Updating breadcrumbs
        this.scenarioName = scenario.name;
        this.scenarioId = scenario.id;
        this.planStateService.updateStateWithScenario(
          this.scenarioId,
          this.scenarioName
        );

        this.disableForms();
        if (scenario.scenario_result) {
          this.scenarioResults = scenario.scenario_result;
          this.scenarioState = scenario.scenario_result?.status;
          this.priorities =
            scenario.configuration.treatment_question?.scenario_priorities ||
            [];

          this.selectedTab = ScenarioTabs.RESULTS;
          if (this.scenarioState == 'SUCCESS') {
            this.processScenarioResults(scenario);
          }
          // enable animation
          this.tabAnimation = this.tabAnimationOptions.on;
        }

        //setting name
        if (scenario.name) {
          this.scenarioNameFormField?.setValue(scenario.name);
        }
        // setting treatment question
        if (scenario.configuration.treatment_question) {
          this.prioritiesComponent.setFormData(
            scenario.configuration.treatment_question
          );
        }
        // setting constraints
        this.constraintsPanelComponent.setFormData(scenario.configuration);
      },
      error: () => {
        this.scenarioNotFound = true;
      },
    });
  }

  private formValueToScenario(): Scenario {
    return {
      id: '',
      name: this.scenarioNameFormField?.value,
      planning_area: this.planId ? this.planId.toString() : '', // nope I should have planID
      status: 'ACTIVE',
      configuration: {
        ...this.constraintsPanelComponent.getFormData(),
        ...this.prioritiesComponent.getFormData(),
      },
    };
  }

  /** Creates the scenario */
  // TODO Add support for uploaded Project Area shapefiles
  createScenario(): void {
    this.forms.markAllAsTouched();
    if (this.forms.invalid) {
      return;
    }
    this.generatingScenario = true;
    this.goalOverlayService.close();
    this.planStateService
      .createScenario(this.formValueToScenario())
      .pipe(
        catchError((error) => {
          this.generatingScenario = false;
          this.matSnackBar.open(error.message, 'Dismiss', SNACK_ERROR_CONFIG);
          return NEVER;
        })
      )
      .subscribe((newScenario) => {
        // Setting the new scenario id
        this.scenarioId = newScenario.id;
        this.scenarioName = newScenario.name;
        this.matSnackBar.dismiss();
        this.scenarioState = 'PENDING';
        this.disableForms();
        this.selectedTab = ScenarioTabs.RESULTS;
        this.pollForChanges();
        this.goToScenario();
      });
  }

  disableForms() {
    this.scenarioNameFormField?.disable();
    this.prioritiesForm?.disable();
    this.constrainsForm?.disable();
  }

  /**
   * Processes Scenario Results into ChartData format and updates PlanService State with Project Area shapes
   */
  processScenarioResults(scenario: Scenario) {
    let plan = this.plan$.getValue();
    if (scenario && this.scenarioResults && plan) {
      this.metricsService
        .getMetricsForRegion(plan.region_name)
        .subscribe((metrics) => {
          if (this.scenarioResults) {
            this.scenarioChartData = processScenarioResultsToChartData(
              metrics,
              scenario.configuration,
              this.scenarioResults
            );
          }
        });

      this.planStateService.updateStateWithShapes(
        this.scenarioResults?.result.features
      );
    }
  }

  /**
   * Converts each feature found in a GeoJSON into individual GeoJSONs, else
   * returns the original GeoJSON, which may result in an error upon project area creation.
   * Only polygon or multipolygon feature types are expected in the uploaded shapefile.
   */
  convertSingleGeoJsonToGeoJsonArray(
    original: GeoJSON.GeoJSON
  ): GeoJSON.GeoJSON[] {
    const geometries: GeoJSON.GeoJSON[] = [];
    if (original.type === 'FeatureCollection' && original.features) {
      original.features.forEach((feat) => {
        geometries.push({
          type: 'FeatureCollection',
          features: [feat],
        });
      });
    } else {
      geometries.push(original);
    }
    return geometries;
  }

  private drawShapes(shapes: any | null): void {
    this.planStateService.updateStateWithShapes(shapes);
  }

  goToConfig() {
    this.router.navigate(['plan', this.plan$.value?.id, 'config']);
  }

  get projectAreasForm(): FormGroup {
    return this.forms.get('projectAreas') as FormGroup;
  }

  get scenarioNameFormField() {
    return this.forms.get('scenarioName');
  }

  get prioritiesForm() {
    return this.forms.get('priorities');
  }

  get constrainsForm() {
    return this.forms.get('constrains');
  }

  get showTreatmentsTab() {
    return (
      this.scenarioState === 'SUCCESS' &&
      this.featureService.isFeatureEnabled('treatments')
    );
  }

  showTreatmentFooter() {
    const plan = this.plan$.value;
    // if feature is on, the scenario is done, and I have permissions to create new one
    return this.showTreatmentsTab && !!plan && canAddTreatmentPlan(plan);
  }

  openTreatmentDialog() {
    this.analyticsService.emitEvent(
      'new_treatment_plan',
      'scenario_view_page',
      'New Treatment Plan'
    );
    this.dialog
      .open(CreateTreatmentDialogComponent)
      .afterClosed()
      .pipe(take(1))
      .subscribe((name) => {
        if (name) {
          this.createTreatment(name);
        }
      });
  }

  createTreatment(name: string) {
    this.creatingTreatment = true;
    const scenarioId = this.scenarioId;
    if (!scenarioId) {
      return;
    }

    this.treatmentsService
      .createTreatmentPlan(Number(scenarioId), name)
      .subscribe({
        next: (result) => {
          this.goToTreatment(result.id);
        },
        error: () => {
          this.creatingTreatment = false;
          this.matSnackBar.open(
            '[Error] Cannot create a new treatment plan',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }

  goToTreatment(id: number) {
    this.router.navigate(['treatment', id], {
      relativeTo: this.route,
    });
  }

  goToScenario() {
    // Updating breadcrums so when we navigate we can see it
    this.planStateService.updateStateWithScenario(
      this.scenarioId,
      this.scenarioName
    );
    this.router.navigate(['/plan', this.planId, 'config', this.scenarioId]);
  }
}

function scenarioNameMustBeNew(
  nameControl: AbstractControl,
  existingNames: string[]
): {
  [key: string]: any;
} | null {
  if (existingNames.includes(nameControl.value)) {
    return { duplicate: true };
  }
  return null;
}

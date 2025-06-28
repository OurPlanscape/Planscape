import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import {
  BehaviorSubject,
  catchError,
  firstValueFrom,
  interval,
  map,
  NEVER,
  take,
} from 'rxjs';
import { Plan, Scenario, ScenarioResult, ScenarioResultStatus } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../plan-helpers';
import { Router } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { LegacyPlanStateService, ScenarioService } from '@services';
import { SNACK_ERROR_CONFIG } from '@shared';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { GoalOverlayService } from './goal-overlay/goal-overlay.service';
import { canAddTreatmentPlan } from '../permissions';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { FeatureService } from 'src/app/features/feature.service';

enum ScenarioTabs {
  CONFIG,
  RESULTS,
  TREATMENTS,
  DATA_LAYERS,
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
  // this value gets updated once we load the scenario result.
  scenarioState: ScenarioResultStatus = 'NOT_STARTED';
  scenarioResults: ScenarioResult | null = null;
  priorities: string[] = [];
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

  isLoading$ = new BehaviorSubject(true);

  constructor(
    private fb: FormBuilder,
    private LegacyPlanStateService: LegacyPlanStateService,
    private scenarioService: ScenarioService,
    private router: Router,
    private matSnackBar: MatSnackBar,
    private goalOverlayService: GoalOverlayService,
    private scenarioStateService: ScenarioState,
    private featureService: FeatureService
  ) {}

  async createForms() {
    await this.constraintsPanelComponent.loadExcludedAreas();
    const constrainsForm = await this.constraintsPanelComponent.createForm();
    this.forms = this.fb.group({
      scenarioName: new FormControl('', [Validators.required]),
      priorities: this.prioritiesComponent.createForm(),
      constrains: constrainsForm,
      projectAreas: this.fb.group({
        generateAreas: [''],
        uploadedArea: [''],
      }),
    });
  }

  ngOnInit() {
    this.isLoading$.next(true);
    this.initScenario();
  }

  async initScenario() {
    await this.createForms();
    // Get plan details and current config ID from plan state, then load the config.
    this.LegacyPlanStateService.planState$
      .pipe(untilDestroyed(this), take(1))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioId = planState.currentScenarioId;
        this.planId = planState.currentPlanId;
        if (this.plan$.getValue()?.region_name) {
          this.LegacyPlanStateService.setPlanRegion(
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
      const existingScenarios = await firstValueFrom(
        this.scenarioService.getScenariosForPlan(this.planId)
      );
      const existingScenarioNames = existingScenarios.map((s) => s.name);
      this.forms
        .get('scenarioName')
        ?.addValidators([
          (control: AbstractControl) =>
            scenarioNameMustBeNew(control, existingScenarioNames),
        ]);
      this.isLoading$.next(false);
    }
    this.isLoading$.next(false);
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
    this.LegacyPlanStateService.getScenario(this.scenarioId!).subscribe({
      next: (scenario: Scenario) => {
        // if we have the same state do nothing.
        if (this.scenarioState === scenario.scenario_result?.status) {
          return;
        }

        // Updating breadcrumbs
        this.scenarioName = scenario.name;
        this.scenarioId = scenario.id;
        this.LegacyPlanStateService.updateStateWithScenario(
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
            this.scenarioStateService.reloadScenario();
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
        this.isLoading$.next(false);
      },
      error: () => {
        this.scenarioNotFound = true;
        this.isLoading$.next(false);
      },
    });
  }

  private formValueToScenario(): Scenario {
    const prioritiesData = this.prioritiesComponent.getFormData();
    return {
      id: '',
      name: this.scenarioNameFormField?.value,
      planning_area: this.planId!,
      status: 'ACTIVE',
      configuration: {
        ...this.constraintsPanelComponent.getFormData(),
        ...prioritiesData,
      },
      treatment_goal: this.featureService.isFeatureEnabled(
        'STATEWIDE_SCENARIOS'
      )
        ? prioritiesData.treatment_question
        : (prioritiesData.treatment_question as any).id,
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

    if (this.featureService.isFeatureEnabled('STATEWIDE_SCENARIOS')) {
      this.scenarioService
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
    } else {
      this.LegacyPlanStateService.createScenario(this.formValueToScenario())
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
      this.LegacyPlanStateService.updateStateWithShapes(
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
    this.LegacyPlanStateService.updateStateWithShapes(shapes);
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
    return this.scenarioState === 'SUCCESS';
  }

  showTreatmentFooter() {
    const plan = this.plan$.value;
    if (this.selectedTab === ScenarioTabs.DATA_LAYERS) {
      return false;
    }
    // if feature is on, the scenario is done, and I have permissions to create new one
    return this.showTreatmentsTab && !!plan && canAddTreatmentPlan(plan);
  }

  goToScenario() {
    // Updating breadcrums so when we navigate we can see it
    this.LegacyPlanStateService.updateStateWithScenario(
      this.scenarioId,
      this.scenarioName
    );
    this.router.navigate(['/plan', this.planId, 'config', this.scenarioId]);
  }

  goToPlan() {
    this.router.navigate(['/plan', this.planId]);
  }
}

function scenarioNameMustBeNew(
  nameControl: AbstractControl,
  existingNames: string[]
): {
  [key: string]: any;
} | null {
  if (existingNames.includes(nameControl.value?.trim())) {
    return { duplicate: true };
  }
  return null;
}

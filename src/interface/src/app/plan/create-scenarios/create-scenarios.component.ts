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
  Observable,
  of,
  skip,
  switchMap,
} from 'rxjs';
import { Scenario, ScenarioResult, ScenarioResultStatus } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../plan-helpers';
import { ActivatedRoute, Router } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { LegacyPlanStateService, ScenarioService } from '@services';
import { SNACK_ERROR_CONFIG } from '@shared';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';
import { ConstraintsPanelComponent } from './constraints-panel/constraints-panel.component';
import { GoalOverlayService } from './goal-overlay/goal-overlay.service';
import { canAddTreatmentPlan } from '../permissions';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { MatTabGroup } from '@angular/material/tabs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { PlanState } from '../plan.state';

export enum ScenarioTabs {
  CONFIG,
  RESULTS,
  DATA_LAYERS,
  TREATMENTS,
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
  SCENARIO_TABS = ScenarioTabs;
  generatingScenario: boolean = false;
  scenarioId: number | undefined = this.route.snapshot.data['scenarioId'];

  // Current plan ID, if we are in create-scenario we always have a valid plan
  planId: number = this.route.parent!.snapshot.data['planId'];
  plan$ = this.planState.currentPlan$;

  // Current scenario or null in case we are creating a new scenario
  scenario$: Observable<Scenario | null> =
    this.scenarioStateService.currentScenarioId$.pipe(
      untilDestroyed(this),
      switchMap((scenarioId) => {
        return scenarioId
          ? this.scenarioStateService.currentScenario$
          : of(null);
      })
    );

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

  scenarioVersion: string | undefined = undefined;

  tabAnimation = this.tabAnimationOptions.off;

  scenarioNotFound = false;

  @ViewChild(SetPrioritiesComponent, { static: true })
  prioritiesComponent!: SetPrioritiesComponent;

  @ViewChild(ConstraintsPanelComponent, { static: true })
  constraintsPanelComponent!: ConstraintsPanelComponent;

  isLoading$ = new BehaviorSubject(true);

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  showTreatmentFooter$ = this.plan$.pipe(
    map((plan) => {
      // if feature is on, the scenario is done, and I have permissions to create new one
      return this.showTreatmentsTab && !!plan && canAddTreatmentPlan(plan);
    })
  );

  constructor(
    private fb: FormBuilder,
    private LegacyPlanStateService: LegacyPlanStateService,
    private scenarioService: ScenarioService,
    private router: Router,
    private matSnackBar: MatSnackBar,
    private goalOverlayService: GoalOverlayService,
    private scenarioStateService: ScenarioState,
    private dataLayersStateService: DataLayersStateService,
    private planState: PlanState,
    private route: ActivatedRoute
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
  }

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
    // Creating the forms
    await this.createForms();

    // Setting plan region if we have a valid regiion
    this.setPlanRegion();

    // Setting the scenario name validator
    this.setExistingNameValidator();

    // initialize scenario component - if we are creating or viewing a scenario
    this.setScenarioMode();

    // Listening for project area changes
    this.listenForProjectAreasChanges();
  }

  setScenarioMode() {
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
      this.isLoading$.next(false);
    }
  }

  async setExistingNameValidator() {
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
  }

  async setPlanRegion() {
    const plan = await firstValueFrom(this.plan$);
    if (plan.region_name) {
      0.0;
      this.LegacyPlanStateService.setPlanRegion(plan.region_name!);
    }
  }

  listenForProjectAreasChanges() {
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
    this.scenarioService.getScenario(this.scenarioId!).subscribe({
      next: (scenario: Scenario) => {
        // if we have the same state do nothing.
        if (this.scenarioState === scenario.scenario_result?.status) {
          return;
        }

        // Updating breadcrumbs
        this.scenarioId = scenario.id;
        this.LegacyPlanStateService.updateStateWithScenario(
          this.scenarioId,
          scenario.name
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

        // setting constraints
        this.constraintsPanelComponent.setFormData(scenario.configuration);

        // setting version
        this.scenarioVersion = scenario.version;

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
      id: undefined,
      name: this.scenarioNameFormField?.value,
      planning_area: this.planId,
      status: 'ACTIVE',
      configuration: {
        ...this.constraintsPanelComponent.getFormData(),
        ...prioritiesData,
      },
      treatment_goal: prioritiesData.treatment_question as any,
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

    const scenarioParams = this.formValueToScenario();

    this.scenarioService
      .createScenario(scenarioParams)
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
    if (scenario && this.scenarioResults && this.planId) {
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
    this.router.navigate(['plan', this.planId, 'config']);
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

  async goToScenario() {
    const scenario = await firstValueFrom(this.scenario$);
    if (scenario) {
      // Updating breadcrums so when we navigate we can see it
      this.LegacyPlanStateService.updateStateWithScenario(
        scenario.id,
        scenario.name
      );
    }
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

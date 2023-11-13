import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  interval,
  NEVER,
  Observable,
  take,
} from 'rxjs';
import {
  Plan,
  Scenario,
  ScenarioConfig,
  ScenarioResult,
  ScenarioResultStatus,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from 'src/app/types';
import features from '../../features/features.json';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { POLLING_INTERVAL } from '../plan-helpers';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanStateService } from '../../services/plan-state.service';
import { SNACK_ERROR_CONFIG } from '../../shared/constants';
import { SetPrioritiesComponent } from './set-priorities/set-priorities.component';

@UntilDestroy()
@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
})
export class CreateScenariosComponent implements OnInit {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;
  selectedTabIndex = 0;
  generatingScenario: boolean = false;
  scenarioId?: string | null;
  plan$ = new BehaviorSubject<Plan | null>(null);

  formGroups: FormGroup[] = [this.fb.group({})];

  treatmentGoals$: Observable<TreatmentGoalConfig[] | null>;

  excludedAreasOptions: Array<string> = [
    'National Forests',
    'National Parks',
    'Private Land',
    'State Parks',
    'Tribal Lands',
    'Wilderness Area',
  ];

  project_area_upload_enabled = features.upload_project_area;

  // this value gets updated once we load the scenario result.
  scenarioState: ScenarioResultStatus = 'NOT_STARTED';
  scenarioResults: ScenarioResult | null = null;
  treatmentQuestion: TreatmentQuestionConfig | null = null;
  priorities: string[] = [];
  scenarioChartData: any[] = [];
  tabAnimationOptions: Record<'on' | 'off', string> = {
    on: '500ms',
    off: '0ms',
  };

  tabAnimation = this.tabAnimationOptions.off;

  @ViewChild(SetPrioritiesComponent, { static: true })
  prioritiesComponent!: SetPrioritiesComponent;

  constructor(
    private fb: FormBuilder,
    private planStateService: PlanStateService,
    private router: Router,
    private matSnackBar: MatSnackBar
  ) {
    this.treatmentGoals$ = this.planStateService.treatmentGoalsConfig$.pipe(
      distinctUntilChanged(),
      untilDestroyed(this)
    );

    // TODO Move form builders to their corresponding components rather than passing as input
    // TODO Name groups to make easier to access (instead of having to use index)
    // Initialize empty form
  }

  createForms() {
    var excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    this.excludedAreasOptions.forEach((area: string) => {
      excludedAreasChosen[area] = [false, Validators.required];
    });
    this.formGroups = [
      // Step 1: Name the scenario
      this.fb.group({
        scenarioName: [, Validators.required],
      }),
      // Step 2: Select priorities
      this.prioritiesComponent.createForm(),
      // Step 3: Set constraints
      this.fb.group(
        {
          budgetForm: this.fb.group({
            // Estimated cost in $ per acre
            estimatedCost: [2470, Validators.min(0)],
            // Max cost of treatment for entire planning area
            // Initially disabled, estimatedCost is required as input before maxCost is enabled
            maxCost: ['', Validators.min(0.01)],
          }),
          physicalConstraintForm: this.fb.group({
            // TODO Update if needed once we have confirmation if this is the correct default %
            // Maximum slope allowed for planning area
            maxSlope: [, [Validators.min(0), Validators.max(100)]],
            // Minimum distance from road allowed for planning area
            minDistanceFromRoad: [, [Validators.min(0)]],
            // Maximum area to be treated in acres
            // Using 500 as minimum for now. Ideally the minimum should be based on stand size.
            maxArea: ['', [Validators.min(500)]],
            // Stand Size selection
            standSize: ['LARGE', Validators.required],
          }),
          excludedAreasForm: this.fb.group(excludedAreasChosen),
          excludeAreasByDegrees: [true],
          excludeAreasByDistance: [true],
        },
        { validators: this.constraintsFormValidator }
      ),
      // Step 4: Identify project areas
      this.fb.group({
        // TODO Use flag to set required validator
        generateAreas: [''],
        uploadedArea: [''],
      }),
    ];
  }

  ngOnInit(): void {
    this.createForms();
    // Get plan details and current config ID from plan state, then load the config.
    this.planStateService.planState$
      .pipe(untilDestroyed(this))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioId = planState.currentScenarioId;
        if (this.plan$.getValue()?.region) {
          this.planStateService.setPlanRegion(this.plan$.getValue()?.region!);
        }
      });

    if (this.scenarioId) {
      // Has to be outside service subscription or else will cause infinite loop
      this.loadConfig();
      this.pollForChanges();
      // if we have an id go to the results tab.
      this.selectedTabIndex = 1;
    } else {
      // enable animation
      this.tabAnimation = this.tabAnimationOptions.on;
    }

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.formGroups[3].valueChanges.subscribe((_) => {
      const generateAreas = this.formGroups[3].get('generateAreas');
      const uploadedArea = this.formGroups[3].get('uploadedArea');
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

  private constraintsFormValidator(
    constraintsForm: AbstractControl
  ): ValidationErrors | null {
    // Only one of budget or treatment area constraints is required.
    const maxCost = constraintsForm.get('budgetForm.maxCost');
    const maxArea = constraintsForm.get('physicalConstraintForm.maxArea');
    const valid = !!maxCost?.value || !!maxArea?.value;
    return valid ? null : { budgetOrAreaRequired: true };
  }

  loadConfig(): void {
    this.scenarioState = this.scenarioId ? 'PENDING' : 'LOADING';
    this.planStateService
      .getScenario(this.scenarioId!)
      .subscribe((scenario) => {
        // if we have the same state do nothing.
        if (this.scenarioState === scenario.scenario_result?.status) {
          return;
        }
        this.disableForms();
        if (scenario.scenario_result) {
          this.scenarioResults = scenario.scenario_result;
          this.scenarioState = scenario.scenario_result?.status;
          this.priorities =
            scenario.configuration.treatment_question?.scenario_priorities ||
            [];
          this.selectedTabIndex = 1;
          if (this.scenarioState == 'SUCCESS') {
            this.processScenarioResults(scenario);
          }
          // enable animation
          this.tabAnimation = this.tabAnimationOptions.on;
        }

        var config = scenario.configuration;

        this.treatmentQuestion = config.treatment_question || null;

        this.excludedAreasOptions.forEach((area: string) => {
          if (
            config.excluded_areas &&
            config.excluded_areas.indexOf(area) > -1
          ) {
            this.formGroups[2].get('excludedAreasForm.' + area)?.setValue(true);
          } else {
            this.formGroups[2]
              .get('excludedAreasForm.' + area)
              ?.setValue(false);
          }
        });

        if (scenario.name) {
          this.formGroups[0].get('scenarioName')?.setValue(scenario.name);
        }
        if (config.est_cost) {
          this.formGroups[2]
            .get('budgetForm.estimatedCost')
            ?.setValue(config.est_cost);
        }
        if (config.max_budget) {
          this.formGroups[2]
            .get('budgetForm.maxCost')
            ?.setValue(config.max_budget);
        }
        if (config.max_treatment_area_ratio) {
          this.formGroups[2]
            .get('physicalConstraintForm.maxArea')
            ?.setValue(config.max_treatment_area_ratio);
        }
        if (config.min_distance_from_road) {
          this.formGroups[2]
            .get('physicalConstraintForm.minDistanceFromRoad')
            ?.setValue(config.min_distance_from_road);
        }
        if (config.max_slope) {
          this.formGroups[2]
            .get('physicalConstraintForm.maxSlope')
            ?.setValue(config.max_slope);
        }

        if (config.stand_size) {
          this.formGroups[2]
            .get('physicalConstraintForm.standSize')
            ?.setValue(config.stand_size);
        }
      });
  }

  private formValueToScenario(): Scenario {
    const estimatedCost = this.formGroups[2].get('budgetForm.estimatedCost');
    const maxCost = this.formGroups[2].get('budgetForm.maxCost');
    const maxArea = this.formGroups[2].get('physicalConstraintForm.maxArea');
    const minDistanceFromRoad = this.formGroups[2].get(
      'physicalConstraintForm.minDistanceFromRoad'
    );
    const maxSlope = this.formGroups[2].get('physicalConstraintForm.maxSlope');
    const selectedQuestion = this.formGroups[1].get('selectedQuestion');
    const scenarioName = this.formGroups[0].get('scenarioName');

    let scenarioNameConfig: string = '';
    let plan_id: string = '';
    this.planStateService.planState$
      .pipe(untilDestroyed(this))
      .subscribe((planState) => {
        plan_id = planState.currentPlanId!;
      });
    let scenarioConfig: ScenarioConfig = {};

    scenarioConfig.stand_size = this.formGroups[2].get(
      'physicalConstraintForm.standSize'
    )?.value;
    scenarioConfig.excluded_areas = [];
    this.excludedAreasOptions.forEach((area: string) => {
      if (
        this.formGroups[2].get('excludedAreasForm.' + area)?.valid &&
        this.formGroups[2].get('excludedAreasForm.' + area)?.value
      ) {
        scenarioConfig.excluded_areas?.push(area);
      }
    });
    if (estimatedCost?.valid)
      scenarioConfig.est_cost = parseFloat(estimatedCost.value);
    if (maxCost?.valid) scenarioConfig.max_budget = parseFloat(maxCost.value);
    if (maxArea?.valid) {
      scenarioConfig.max_treatment_area_ratio = parseFloat(maxArea.value);
    }
    if (minDistanceFromRoad?.valid) {
      scenarioConfig.min_distance_from_road = parseFloat(
        minDistanceFromRoad.value
      );
    }
    if (maxSlope?.valid) scenarioConfig.max_slope = parseFloat(maxSlope.value);
    if (selectedQuestion?.valid) {
      scenarioConfig.treatment_question = selectedQuestion.value;
    }
    if (scenarioName?.valid) {
      scenarioNameConfig = scenarioName.value;
    }

    return {
      name: scenarioNameConfig,
      planning_area: plan_id,
      configuration: scenarioConfig,
    };
  }

  /** Creates the scenario */
  // TODO Add support for uploaded Project Area shapefiles
  createScenario(): void {
    this.formGroups.forEach((form) => form.markAllAsTouched());
    if (this.formGroups.some((form) => form.invalid)) {
      return;
    }
    this.generatingScenario = true;
    // TODO Add error catching for failed scenario creation
    this.planStateService
      .createScenario(this.formValueToScenario())
      .pipe(
        catchError((error) => {
          this.generatingScenario = false;
          this.matSnackBar.open(error.message, 'Dismiss', SNACK_ERROR_CONFIG);
          return NEVER;
        })
      )
      .subscribe(() => {
        this.matSnackBar.dismiss();
        this.scenarioState = 'PENDING';
        this.disableForms();
        this.selectedTabIndex = 1;
        this.pollForChanges();
      });

    // this.createUploadedProjectAreas()
    //   .pipe(
    //     take(1),
    //     concatMap(() => {
    //       return this.planService.createScenario(
    //         this.formValueToProjectConfig()
    //       );
    //     }),

    // TODO Implement more specific error catching (currently raises shapefile error message for any thrown error)
    // catchError(() => {
    //   this.matSnackBar.open(
    //     '[Error] Project area shapefile should only include polygons or multipolygons',
    //     'Dismiss',
    //     {
    //       duration: 10000,
    //       panelClass: ['snackbar-error'],
    //       verticalPosition: 'top',
    //     }
    //   );
    //   return throwError(
    //     () => new Error('Problem creating uploaded project areas')
    //   );
    // })
    // )
    // .subscribe(() => {
    //   // Navigate to scenario confirmation page
    //   const planId = this.plan$.getValue()?.id;
    //   this.router.navigate(['scenario-confirmation', planId]);
    // });
  }

  disableForms() {
    this.formGroups[0].disable();
    this.formGroups[1].disable();
    this.formGroups[2].disable();
  }

  // createUploadedProjectAreas() {
  //   const uploadedArea = this.formGroups[2].get('uploadedArea')?.value;
  //   if (this.scenarioConfigId && uploadedArea) {
  //     return this.planService.bulkCreateProjectAreas(
  //       this.scenarioConfigId,
  //       this.convertSingleGeoJsonToGeoJsonArray(uploadedArea)
  //     );
  //   }
  //   return of(null);
  // }

  /**
   * Processes Scenario Results into ChartData format and updates PlanService State with Project Area shapes
   */
  processScenarioResults(scenario: Scenario) {
    var scenario_output_fields_paths =
      scenario?.configuration.treatment_question?.scenario_output_fields_paths!;
    var labels: string[][] = [];
    if (scenario && this.scenarioResults) {
      this.planStateService
        .getMetricData(scenario_output_fields_paths)
        .pipe(take(1))
        .subscribe((metric_data) => {
          for (let metric in metric_data) {
            var displayName = metric_data[metric]['display_name'];
            var dataUnits = metric_data[metric]['data_units'];
            var metricLayer = metric_data[metric]['raw_layer'];
            var metricName = metric_data[metric]['metric_name'];
            var metricData: string[] = [];
            this.scenarioResults?.result.features.map((featureCollection) => {
              const props = featureCollection.properties;
              metricData.push(props[metric]);
            });
            labels.push([
              displayName,
              dataUnits,
              metricLayer,
              metricData,
              metricName,
            ]);
          }
          this.scenarioChartData = labels.map((label, _) => ({
            label: label[0],
            measurement: label[1],
            metric_layer: label[2],
            values: label[3],
            key: label[4],
          }));
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

  changeCondition(layer: string): void {
    this.planStateService.updateStateWithConditionLayer(layer);
  }

  private drawShapes(shapes: any | null): void {
    this.planStateService.updateStateWithShapes(shapes);
  }

  goBackToPlanning() {
    this.router.navigate(['plan', this.plan$.value?.id]);
  }
}

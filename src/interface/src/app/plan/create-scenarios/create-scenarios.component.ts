import { Component, OnInit, ViewChild } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject, interval, Observable } from 'rxjs';
import { PlanService } from 'src/app/services';
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

  formGroups: FormGroup[];
  nameFormGroup: FormGroup<any>;
  treatmentGoalGroup: FormGroup<any>;
  constraintsFormGroup: FormGroup<any>;
  projectAreaGroup: FormGroup<any>;
  treatmentGoals: Observable<TreatmentGoalConfig[] | null>;
  defaultSelectedQuestion: TreatmentQuestionConfig = {
    short_question_text: '',
    scenario_priorities: [''],
    scenario_output_fields: [''],
    stand_thresholds: [''],
    global_thresholds: [''],
    weights: [0],
  };
  excludedAreasOptions: Array<string> = [
    'Private Land',
    'National Forests and Parks',
    'Wilderness Area',
    'Tribal Lands',
  ];

  project_area_upload_enabled = features.upload_project_area;

  // this value gets updated once we load the scenario result.
  scenarioState: ScenarioResultStatus = 'NOT_STARTED';

  scenarioResults: ScenarioResult | null = null;

  constructor(
    private fb: FormBuilder,
    private planService: PlanService,
    private router: Router
  ) {
    this.treatmentGoals = this.planService.treatmentGoalsConfig$.pipe(
      untilDestroyed(this)
    );

    var excludedAreasChosen: { [key: string]: (boolean | Validators)[] } = {};
    this.excludedAreasOptions.forEach((area: string) => {
      excludedAreasChosen[area] = [false, Validators.required];
    });
    // TODO Move form builders to their corresponding components rather than passing as input
    // TODO Name groups to make easier to access (instead of having to use index)
    // Initialize empty form
    this.formGroups = [
      // Step 1: Name the scenario
      this.fb.group({
        scenarioName: [, Validators.required],
      }),
      // Step 2: Select priorities
      this.fb.group({
        selectedQuestion: ['', Validators.required],
      }),
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
            maxSlope: [
              37,
              [Validators.min(0), Validators.max(100), Validators.required],
            ],
            // Minimum distance from road allowed for planning area
            minDistanceFromRoad: [
              1000,
              [Validators.min(0), Validators.required],
            ],
            // Maximum area to be treated in acres
            maxArea: ['', [Validators.min(0)]],
            // Stand Size selection
            standSize: ['Large', Validators.required],
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

    //TODO Change this.formGroups into a formGroup to be able to set child form group names on creation
    this.nameFormGroup = this.formGroups[0];
    this.treatmentGoalGroup = this.formGroups[1];
    this.constraintsFormGroup = this.formGroups[2];
    this.projectAreaGroup = this.formGroups[3];
  }

  ngOnInit(): void {
    // Get plan details and current config ID from plan state, then load the config.
    this.planService.planState$
      .pipe(untilDestroyed(this))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioId = planState.currentScenarioId;
        if (this.plan$.getValue()?.region) {
          this.planService.setPlanRegion(this.plan$.getValue()?.region!);
        }
      });

    if (this.scenarioId) {
      // Has to be outside of service subscription or else will cause infinite loop
      this.loadConfig();
      this.pollForChanges();
    }

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.projectAreaGroup.valueChanges.subscribe((_) => {
      const generateAreas = this.projectAreaGroup.get('generateAreas');
      const uploadedArea = this.projectAreaGroup.get('uploadedArea');
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
    this.planService.getScenario(this.scenarioId!).subscribe((scenario) => {
      if (scenario.scenario_result) {
        this.scenarioResults = scenario.scenario_result;
        this.scenarioState = scenario.scenario_result?.status;
        this.disableForms();
        this.selectedTabIndex = 1;
      }

      var config = scenario.configuration;
      const scenarioName = this.nameFormGroup.get('scenarioName');
      const estimatedCost = this.constraintsFormGroup.get(
        'budgetForm.estimatedCost'
      );
      const maxCost = this.constraintsFormGroup.get('budgetForm.maxCost');
      const maxArea = this.constraintsFormGroup.get(
        'physicalConstraintForm.maxArea'
      );
      const minDistanceFromRoad = this.constraintsFormGroup.get(
        'physicalConstraintForm.minDistanceFromRoad'
      );
      const maxSlope = this.constraintsFormGroup.get(
        'physicalConstraintForm.maxSlope'
      );
      this.excludedAreasOptions.forEach((area: string) => {
        if (config.excluded_areas && config.excluded_areas.indexOf(area) > -1) {
          this.constraintsFormGroup
            .get('excludedAreasForm.' + area)
            ?.setValue(true);
        } else {
          this.constraintsFormGroup
            .get('excludedAreasForm.' + area)
            ?.setValue(false);
        }
      });
      const selectedQuestion = this.treatmentGoalGroup.get('selectedQuestion');

      if (scenario.name) {
        scenarioName?.setValue(scenario.name);
      }
      if (config.est_cost) {
        estimatedCost?.setValue(config.est_cost);
      }
      if (config.max_budget) {
        maxCost?.setValue(config.max_budget);
      }
      if (config.max_treatment_area_ratio) {
        maxArea?.setValue(config.max_treatment_area_ratio);
      }
      if (config.min_distance_from_road) {
        minDistanceFromRoad?.setValue(config.min_distance_from_road);
      }
      if (config.max_slope) {
        maxSlope?.setValue(config.max_slope);
      }
      if (config.treatment_question) {
        selectedQuestion?.setValue(config.treatment_question);
      }
    });
  }

  private formValueToScenario(): Scenario {
    const estimatedCost = this.constraintsFormGroup.get(
      'budgetForm.estimatedCost'
    );
    const maxCost = this.constraintsFormGroup.get('budgetForm.maxCost');
    const maxArea = this.constraintsFormGroup.get(
      'physicalConstraintForm.maxArea'
    );
    const minDistanceFromRoad = this.constraintsFormGroup.get(
      'physicalConstraintForm.minDistanceFromRoad'
    );
    const maxSlope = this.constraintsFormGroup.get(
      'physicalConstraintForm.maxSlope'
    );
    const selectedQuestion = this.treatmentGoalGroup.get('selectedQuestion');
    const scenarioName = this.nameFormGroup.get('scenarioName');

    let scenarioNameConfig: string = '';
    let plan_id: string = '';
    this.planService.planState$
      .pipe(untilDestroyed(this))
      .subscribe((planState) => {
        plan_id = planState.currentPlanId!;
      });
    let scenarioConfig: ScenarioConfig = {};
    scenarioConfig.excluded_areas = [];
    this.excludedAreasOptions.forEach((area: string) => {
      if (
        this.constraintsFormGroup.get('excludedAreasForm.' + area)?.valid &&
        this.constraintsFormGroup.get('excludedAreasForm.' + area)?.value
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
    this.generatingScenario = true;
    // TODO Add error catching for failed scenario creation
    this.planService
      .createScenario(this.formValueToScenario())
      .subscribe((_) => {
        // const planId = this.plan$.getValue()?.id;
        // TODO maybe this state should come as the result of creating scenario from planService
        this.scenarioState = 'PENDING';
        this.disableForms();
        this.selectedTabIndex = 1;
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
    this.formGroups.forEach((form) => {
      form.disable();
    });
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
    this.planService.updateStateWithConditionLayer(layer);
  }

  private drawShapes(shapes: any | null): void {
    this.planService.updateStateWithShapes(shapes);
  }

  goBackToPlanning() {
    this.router.navigate(['plan', this.plan$.value?.id]);
  }
}

import { StepperSelectionEvent } from '@angular/cdk/stepper';
import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Subject,
  take,
  concatMap,
  of,
  throwError,
  Observable,
} from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { PlanService } from 'src/app/services';
import {
  colorTransitionTrigger,
  expandCollapsePanelTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import {
  Plan,
  ProjectArea,
  ProjectConfig,
  Scenario,
  ScenarioConfig,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from 'src/app/types';
import features from '../../features/features.json';

interface StepState {
  complete?: boolean;
  opened?: boolean;
}

@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    expandCollapsePanelTrigger,
    colorTransitionTrigger({
      triggerName: 'expandCollapseButton',
      colorA: 'white',
      colorB: '#ebebeb',
      timingA: '300ms ease-out',
      timingB: '250ms ease-out',
    }),
    opacityTransitionTrigger({
      triggerName: 'expandCollapsePanelContent',
      timingA: '100ms ease-out',
      timingB: '100ms 250ms ease-out',
    }),
  ],
})
export class CreateScenariosComponent implements OnInit, OnDestroy {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;

  generatingScenario: boolean = false;
  scenarioConfigId?: number | null;
  plan$ = new BehaviorSubject<Plan | null>(null);

  formGroups: FormGroup[];
  nameFormGroup: FormGroup<any>;
  treatmentGoalGroup: FormGroup<any>;
  constraintsFormGroup: FormGroup<any>;
  projectAreaGroup: FormGroup<any>;
  panelExpanded: boolean = true;
  treatmentGoals: Observable<TreatmentGoalConfig[] | null>;
  defaultSelectedQuestion: TreatmentQuestionConfig = {
    question_text: '',
    priorities: [''],
    weights: [0],
  };
  excludedAreasOptions: Array<string> = [
    'Private Land',
    'National Forests and Parks',
    'Wilderness Area',
    'Tribal Lands',
  ];

  private readonly destroy$ = new Subject<void>();
  project_area_upload_enabled = features.upload_project_area;

  constructor(
    private fb: FormBuilder,
    private matSnackBar: MatSnackBar,
    private planService: PlanService,
    private router: Router
  ) {
    this.treatmentGoals = this.planService.treatmentGoalsConfig$.pipe(
      takeUntil(this.destroy$)
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
        scenarioName: ['', Validators.required],
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
            estimatedCost: ['', Validators.min(0)],
            // Max cost of treatment for entire planning area
            // Initially disabled, estimatedCost is required as input before maxCost is enabled
            maxCost: [{ value: '', disabled: true }, Validators.min(0.01)],
          }),
          physicalConstraintForm: this.fb.group({
            // Maximum slope allowed for planning area
            maxSlope: [
              '',
              [Validators.min(0), Validators.max(100), Validators.required],
            ],
            // Minimum distance from road allowed for planning area
            minDistanceFromRoad: ['', [Validators.min(0), Validators.required]],
            // Maximum area to be treated in acres
            maxArea: ['', [Validators.min(0), Validators.required]],
            // Stand Size selection
            // TODO validate to make sure standSize is only 'Small', 'Medium', or 'Large'
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
      .pipe(takeUntil(this.destroy$))
      .subscribe((planState) => {
        this.plan$.next(planState.all[planState.currentPlanId!]);
        this.scenarioConfigId = planState.currentConfigId;
        this.loadConfig();
        this.panelExpanded = planState.panelExpanded ?? false;
      });

    // Has to be outside of service subscription or else will cause infinite loop
    this.loadConfig();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private constraintsFormValidator(
    constraintsForm: AbstractControl
  ): ValidationErrors | null {
    // Only one of budget or treatment area constraints is required.

    // TODO Add maxArea input and make required, this extra validator may be deprecated
    // const estimatedCost = constraintsForm.get('budgetForm.estimatedCost');
    // const maxArea = constraintsForm.get('treatmentForm.maxArea');
    const maxSlope = constraintsForm.get('physicalConstraintForm.maxSlope');
    const maxDistance = constraintsForm.get(
      'physicalConstraintForm.minDistanceFromRoad'
    );
    const valid = !!maxSlope?.value || !!maxDistance?.value;
    return valid ? null : { budgetOrAreaRequired: true };
  }

  private loadConfig(): void {
    this.planService.getProject(this.scenarioConfigId!).subscribe((config) => {
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
        if (config.excluded_areas && config.excluded_areas![area]) {
          this.constraintsFormGroup
            .get('excludedAreasForm.' + area)
            ?.setValue(config.excluded_areas![area]);
        }
      });
      const selectedQuestion = this.treatmentGoalGroup.get('selectedQuestion');

      if (config.name) {
        scenarioName?.setValue(config.name);
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
      // Check if scenario config priorities and weights match those of a question.
      // If so, assume this was the selected treatment question.
      this.treatmentGoals.subscribe((goals) => {
        goals!.forEach((goal) => {
          goal.questions.forEach((question) => {
            if (
              question['priorities']?.toString() ==
                config.priorities?.toString() &&
              question['weights']?.toString() == config.weights?.toString()
            ) {
              selectedQuestion?.setValue(question);
            }
          });
        });
      });
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
      .pipe(takeUntil(this.destroy$))
      .subscribe((planState) => {
        plan_id = planState.currentPlanId!;
      });
    let projectConfig: ProjectConfig = {
      id: this.scenarioConfigId!,
    };
    projectConfig.excluded_areas = {};
    this.excludedAreasOptions.forEach((area: string) => {
      if (this.constraintsFormGroup.get('excludedAreasForm.' + area)?.valid) {
        projectConfig.excluded_areas![area] = this.constraintsFormGroup.get(
          'excludedAreasForm.' + area
        )?.value;
      }
    });
    if (estimatedCost?.valid)
      projectConfig.est_cost = parseFloat(estimatedCost.value);
    if (maxCost?.valid) projectConfig.max_budget = parseFloat(maxCost.value);
    if (maxArea?.valid) {
      projectConfig.max_treatment_area_ratio = parseFloat(maxArea.value);
    }
    if (minDistanceFromRoad?.valid) {
      projectConfig.min_distance_from_road = parseFloat(
        minDistanceFromRoad.value
      );
    }
    if (maxSlope?.valid) projectConfig.max_slope = parseFloat(maxSlope.value);
    if (selectedQuestion?.valid) {
      projectConfig.priorities = selectedQuestion.value['priorities'];
      projectConfig.weights = selectedQuestion!.value['weights'];
    }
    if (scenarioName?.valid) {
      scenarioNameConfig = scenarioName.value;
    }

    return {
      name: scenarioNameConfig,
      planning_area: plan_id,
      configuration: projectConfig,
    };
  }

  private updatePriorityWeightsFormControls(): void {
    const priorities: string[] = this.nameFormGroup.get('priorities')?.value;
    const priorityWeightsForm: FormGroup = this.formGroups[3].get(
      'priorityWeightsForm'
    ) as FormGroup;
    priorityWeightsForm.controls = {};
    priorities.forEach((priority) => {
      const priorityControl = this.fb.control(1, [
        Validators.required,
        Validators.min(1),
        Validators.max(5),
      ]);
      priorityWeightsForm.addControl(priority, priorityControl);
    });
  }

  /** Creates the scenario */
  // TODO Add support for uploaded Project Area shapefiles
  createScenario(): void {
    this.generatingScenario = true;
    // TODO Add error catching for failed scenario creation
    this.planService
      .createScenario(this.formValueToScenario())
      .subscribe((_) => {
        const planId = this.plan$.getValue()?.id;
        this.router.navigate(['scenario-confirmation', planId]);
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

  createUploadedProjectAreas() {
    const uploadedArea = this.formGroups[2].get('uploadedArea')?.value;
    if (this.scenarioConfigId && uploadedArea) {
      return this.planService.bulkCreateProjectAreas(
        this.scenarioConfigId,
        this.convertSingleGeoJsonToGeoJsonArray(uploadedArea)
      );
    }
    return of(null);
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
    this.planService.updateStateWithConditionLayer(layer);
  }

  private drawShapes(shapes: any | null): void {
    this.planService.updateStateWithShapes(shapes);
  }

  togglePanelExpand(): void {
    this.panelExpanded = !this.panelExpanded;
    this.planService.updateStateWithPanelState(this.panelExpanded);
  }
}

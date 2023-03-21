import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
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
  EMPTY,
} from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';
import * as L from 'leaflet';

import { PlanService } from 'src/app/services';
import {
  colorTransitionTrigger,
  expandCollapsePanelTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import { Plan, ProjectArea, ProjectConfig } from 'src/app/types';

interface StepState {
  complete?: boolean;
  opened?: boolean;
}

@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
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

  scenarioConfigId?: number | null;
  plan$ = new BehaviorSubject<Plan | null>(null);

  formGroups: FormGroup[];
  panelExpanded: boolean = true;
  stepStates: StepState[];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private matSnackBar: MatSnackBar,
    private planService: PlanService,
    private router: Router
  ) {
    // Initialize empty form
    this.formGroups = [
      // Step 1: Select priorities
      this.fb.group({
        scoreType: [0, Validators.required],
        priorities: [[], [Validators.required, Validators.minLength(1)]],
      }),
      // Step 2: Set constraints
      this.fb.group(
        {
          budgetForm: this.fb.group({
            maxBudget: ['', Validators.min(0)],
            optimizeBudget: [false],
          }),
          treatmentForm: this.fb.group({
            maxArea: ['', [Validators.min(0), Validators.max(90)]],
          }),
          excludeAreasByDegrees: [false],
          excludeAreasByDistance: [false],
          excludeSlope: ['', Validators.min(0)],
          excludeDistance: ['', Validators.min(0)],
        },
        { validators: this.constraintsFormValidator }
      ),
      // Step 3: Identify project areas
      this.fb.group({
        generateAreas: ['', Validators.required],
        uploadedArea: [''],
      }),
      // Step 4: Generate scenarios
      this.fb.group({
        priorityWeightsForm: this.fb.group({}),
        areaPercent: [
          10,
          [Validators.required, Validators.min(10), Validators.max(40)],
        ],
      }),
    ];

    // Initialize step states (for showing preview text)
    this.stepStates = [
      {
        opened: true,
      },
      {},
      {},
      {},
    ];
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

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.formGroups[2].valueChanges.subscribe((_) => {
      const generateAreas = this.formGroups[2].get('generateAreas');
      const uploadedArea = this.formGroups[2].get('uploadedArea');
      if (generateAreas?.value) {
        this.drawShapes(null);
      } else {
        this.drawShapes(uploadedArea?.value);
      }
    });

    // When priorities are chosen, update the form controls for step 4.
    this.formGroups[0].get('priorities')?.valueChanges.subscribe((_) => {
      this.updatePriorityWeightsFormControls();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private constraintsFormValidator(constraintsForm: AbstractControl): boolean {
    // Only one of budget or max treatment percentage is required.
    const maxBudget = constraintsForm.get('budgetForm.maxBudget');
    const optimizeBudget = constraintsForm.get('budgetForm.optimizeBudget');
    const maxArea = constraintsForm.get('treatmentForm.maxArea');
    return !!maxBudget?.value || !!optimizeBudget?.value || !!maxArea?.value;
  }

  private loadConfig(): void {
    this.planService.getProject(this.scenarioConfigId!).subscribe((config) => {
      const maxBudget = this.formGroups[1].get('budgetForm.maxBudget');
      const maxArea = this.formGroups[1].get('treatmentForm.maxArea');
      const excludeDistance = this.formGroups[1].get('excludeDistance');
      const excludeSlope = this.formGroups[1].get('excludeSlope');
      const priorities = this.formGroups[0].get('priorities');
      const weights = this.formGroups[3].get(
        'priorityWeightsForm'
      ) as FormGroup;

      if (config.max_budget) {
        maxBudget?.setValue(config.max_budget);
      }
      if (config.max_treatment_area_ratio) {
        maxArea?.setValue(config.max_treatment_area_ratio);
      }
      if (config.max_road_distance) {
        excludeDistance?.setValue(config.max_road_distance);
      }
      if (config.max_slope) {
        excludeSlope?.setValue(config.max_slope);
      }
      if (config.priorities) {
        priorities?.setValue(config.priorities);
      }
      if (config.weights) {
        config.priorities?.forEach((priority, index) => {
          weights.controls[priority].setValue(config.weights![index]);
        });
      }
    });
  }

  selectedStepChanged(event: StepperSelectionEvent): void {
    this.stepStates[event.selectedIndex].opened = true;
    // Update scenario config in backend
    if (
      this.scenarioConfigId &&
      this.formGroups.every(
        (formGroup) => formGroup.valid || formGroup.pristine
      )
    ) {
      this.planService
        .updateProject(this.formValueToProjectConfig())
        .subscribe();
    }
  }

  private formValueToProjectConfig(): ProjectConfig {
    const maxBudget = this.formGroups[1].get('budgetForm.maxBudget');
    const maxArea = this.formGroups[1].get('treatmentForm.maxArea');
    const excludeDistance = this.formGroups[1].get('excludeDistance');
    const excludeSlope = this.formGroups[1].get('excludeSlope');
    const priorities = this.formGroups[0].get('priorities');
    const weights = this.formGroups[3].get('priorityWeightsForm') as FormGroup;

    let projectConfig: ProjectConfig = {
      id: this.scenarioConfigId!,
      planId: Number(this.plan$.getValue()?.id),
    };
    if (maxBudget?.valid)
      projectConfig.max_budget = parseFloat(maxBudget.value);
    if (maxArea?.valid)
      projectConfig.max_treatment_area_ratio = parseFloat(maxArea.value);
    if (excludeDistance?.valid)
      projectConfig.max_road_distance = parseFloat(excludeDistance.value);
    if (excludeSlope?.valid)
      projectConfig.max_slope = parseFloat(excludeSlope.value);
    if (priorities?.valid) projectConfig.priorities = priorities.value;
    projectConfig.weights = Object.values(weights.controls).map(
      (control) => control.value
    );

    return projectConfig;
  }

  private updatePriorityWeightsFormControls(): void {
    const priorities: string[] = this.formGroups[0].get('priorities')?.value;
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

  /** Creates the scenario and the uploaded project areas, if provided. */
  createScenarioAndProjectAreas(): void {
    this.createUploadedProjectAreas()
      .pipe(
        take(1),
        concatMap(() => {
          return this.planService.createScenario(
            this.formValueToProjectConfig()
          );
        }),
        catchError(() => {
          this.matSnackBar.open(
            '[Error] Project area shapefile should only include polygons or multipolygons',
            'Dismiss',
            {
              duration: 10000,
              panelClass: ['snackbar-error'],
              verticalPosition: 'top',
            }
          );
          return throwError(
            () => new Error('Problem creating uploaded project areas')
          );
        })
      )
      .subscribe(() => {
        // Navigate to scenario confirmation page
        const planId = this.plan$.getValue()?.id;
        this.router.navigate(['scenario-confirmation', planId]);
      });
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

  changeCondition(filepath: string): void {
    this.planService.updateStateWithConditionFilepath(filepath);
  }

  private drawShapes(shapes: any | null): void {
    this.planService.updateStateWithShapes(shapes);
  }

  togglePanelExpand(): void {
    this.panelExpanded = !this.panelExpanded;
    this.planService.updateStateWithPanelState(this.panelExpanded);
  }
}

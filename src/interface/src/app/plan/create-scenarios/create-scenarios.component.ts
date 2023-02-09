import {
  animate,
  animateChild,
  group,
  query,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PlanService } from 'src/app/services';
import {
  colorTransitionTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import { Plan, ProjectConfig } from 'src/app/types';

import { PlanStep } from './../plan.component';

interface StepState {
  complete?: boolean;
  opened?: boolean;
}

@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
  animations: [
    trigger('expandCollapsePanel', [
      state(
        'expanded',
        style({
          backgroundColor: 'white',
          padding: '*',
          maxWidth: '700px',
        })
      ),
      state(
        'collapsed',
        style({
          backgroundColor: '#ebebeb',
          width: '36px',
        })
      ),
      transition('expanded => collapsed', [
        group([
          query('@expandCollapseButton', animateChild()),
          query('@expandCollapsePanelContent', animateChild()),
          animate('300ms 100ms ease-out'),
        ]),
      ]),
      transition('collapsed => expanded', [
        group([
          query('@expandCollapseButton', animateChild()),
          query('@expandCollapsePanelContent', animateChild()),
          animate('250ms ease-out'),
        ]),
      ]),
    ]),
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
export class CreateScenariosComponent implements OnInit {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;

  @Input() scenarioConfigId?: number;
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Input() planningStep: PlanStep = PlanStep.CreateScenarios;
  @Output() changeConditionEvent = new EventEmitter<string>();
  @Output() drawShapesEvent = new EventEmitter<any>();

  formGroups: FormGroup[];
  readonly PlanStep = PlanStep;
  panelExpanded: boolean = true;
  stepStates: StepState[];

  constructor(private fb: FormBuilder, private planService: PlanService) {
    // Initialize empty form
    this.formGroups = [
      // Step 1: Select condition score
      this.fb.group({
        scoreSelectCtrl: ['', Validators.required],
      }),
      // Step 2: Set constraints
      this.fb.group({
        budgetForm: this.fb.group({
          maxBudget: ['', Validators.min(0)],
          optimizeBudget: [false, Validators.required],
        }),
        treatmentForm: this.fb.group({
          maxArea: ['', [Validators.required, Validators.min(0)]],
        }),
        excludeAreasByDegrees: [false],
        excludeAreasByDistance: [false],
        excludeSlope: ['', Validators.min(0)],
        excludeDistance: ['', Validators.min(0)],
      }),
      // Step 3: Select priorities
      this.fb.group({
        priorities: [[], [Validators.required, Validators.minLength(1)]],
      }),
      // Step 4: Identify project areas
      this.fb.group({
        generateAreas: ['', Validators.required],
        uploadedArea: [''],
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
      {},
    ];
  }

  ngOnInit(): void {
    if (this.scenarioConfigId !== undefined) {
      this.loadExistingConfig();
    } else {
      this.createNewConfig();
    }

    this.formGroups.forEach((formGroup) => {
      formGroup.valueChanges.subscribe((_) => {
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
      });
    });

    // When an area is uploaded, issue an event to draw it on the map.
    // If the "generate areas" option is selected, remove any drawn areas.
    this.formGroups[3].valueChanges.subscribe((_) => {
      const generateAreas = this.formGroups[3].get('generateAreas');
      const uploadedArea = this.formGroups[3].get('uploadedArea');
      if (generateAreas?.value) {
        this.drawShapesEvent.emit(null);
      } else {
        this.drawShapesEvent.emit(uploadedArea?.value);
      }
    });
  }

  private loadExistingConfig(): void {
    this.planService.getProject(this.scenarioConfigId!).subscribe((config) => {
      const maxBudget = this.formGroups[1].get('budgetForm.maxBudget');
      const maxArea = this.formGroups[1].get('treatmentForm.maxArea');
      const excludeDistance = this.formGroups[1].get('excludeDistance');
      const excludeSlope = this.formGroups[1].get('excludeSlope');
      const priorities = this.formGroups[2].get('priorities');

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
    });
  }

  private createNewConfig(): void {
    this.plan$
      .pipe(
        filter((plan) => !!plan),
        take(1)
      )
      .subscribe((plan) => {
        this.planService
          .createProjectInPlan(plan!.id)
          .subscribe((projectId) => {
            this.scenarioConfigId = projectId;
          });
      });
  }

  selectedStepChanged(event: StepperSelectionEvent): void {
    this.stepStates[event.selectedIndex].opened = true;
  }

  formValueToProjectConfig(): ProjectConfig {
    const maxBudget = this.formGroups[1].get('budgetForm.maxBudget');
    const maxArea = this.formGroups[1].get('treatmentForm.maxArea');
    const excludeDistance = this.formGroups[1].get('excludeDistance');
    const excludeSlope = this.formGroups[1].get('excludeSlope');
    const priorities = this.formGroups[2].get('priorities');

    let projectConfig: ProjectConfig = {
      id: this.scenarioConfigId!,
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

    return projectConfig;
  }
}

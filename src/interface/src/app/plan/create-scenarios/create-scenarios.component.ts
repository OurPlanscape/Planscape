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
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject } from 'rxjs';
import {
  colorTransitionTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import { Plan } from 'src/app/types';

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
export class CreateScenariosComponent {
  @ViewChild(MatStepper) stepper: MatStepper | undefined;

  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Input() planningStep: PlanStep = PlanStep.CreateScenarios;
  @Output() changeConditionEvent = new EventEmitter<string>();

  formGroups: FormGroup[];
  readonly PlanStep = PlanStep;
  panelExpanded: boolean = true;
  stepStates: StepState[];

  constructor(private fb: FormBuilder) {
    // TODO: Get and populate saved scenario config

    this.formGroups = [
      // Step 1: Select condition score
      this.fb.group({
        scoreSelectCtrl: ['', Validators.required],
      }),
      // Step 2: Set constraints
      this.fb.group({
        budgetForm: this.fb.group({
          maxBudget: [''],
          optimizeBudget: [false, Validators.required],
        }),
        treatmentForm: this.fb.group({
          maxArea: ['', Validators.required],
        }),
        excludeAreasByDegrees: [false],
        excludeAreasByDistance: [false],
        excludeSlope: [''],
        excludeDistance: [''],
      }),
    ];
    this.stepStates = [
      {
        opened: true,
      },
      {},
      {},
      {},
      {},
    ];

    this.formGroups.every((formGroup) => {
      formGroup.valueChanges.subscribe((value) => {
        // TODO: save new values to backend
        console.log(value);
      });
    });
  }

  selectedStepChanged(event: StepperSelectionEvent): void {
    this.stepStates[event.selectedIndex].opened = true;
  }
}

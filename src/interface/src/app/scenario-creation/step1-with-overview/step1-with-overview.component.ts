import { Component, Input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { StepDirective } from '@styleguide';
import { PLANNING_APPROACH, ScenarioDraftConfiguration } from '@types';
import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
} from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';

type Step1WithOverviewForm = FormGroup<{
  stand_size: FormControl<STAND_SIZE | null>;
  planning_approach: FormControl<PLANNING_APPROACH | null>;
}>;

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
    PlanningApproachComponent,
  ],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
  providers: [
    { provide: StepDirective, useExisting: Step1WithOverviewComponent },
  ],
})
export class Step1WithOverviewComponent extends StepDirective<ScenarioDraftConfiguration> {
  readonly form: Step1WithOverviewForm = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | null>(null, Validators.required),
    planning_approach: new FormControl<PLANNING_APPROACH | null>(
      null,
      Validators.required
    ),
  });

  @Input() isCustomScenario = false;

  get steps(): OverviewStep[] {
    return this.isCustomScenario
      ? CUSTOM_SCENARIO_OVERVIEW_STEPS
      : SCENARIO_OVERVIEW_STEPS;
  }

  constructor() {
    super();
  }

  getData() {
    const { stand_size, planning_approach } = this.form.value;
    return { stand_size, planning_approach };
  }
}

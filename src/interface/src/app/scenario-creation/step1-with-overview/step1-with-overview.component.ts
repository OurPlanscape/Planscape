import { Component } from '@angular/core';
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
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';
import { SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
    TreatmentGoalSelectorComponent,
  ],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
  providers: [
    { provide: StepDirective, useExisting: Step1WithOverviewComponent },
  ],
})
export class Step1WithOverviewComponent extends StepDirective<ScenarioDraftConfiguration> {
  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;

  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | null>(null, Validators.required),
    treatment_goal: new FormControl<number | null>(null, Validators.required),
  });

  getData() {
    return this.form.value;
  }
}

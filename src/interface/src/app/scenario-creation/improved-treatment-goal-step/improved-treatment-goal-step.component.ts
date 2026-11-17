import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';

@Component({
  selector: 'app-improved-treatment-goal-step',
  standalone: true,
  imports: [],
  templateUrl: './improved-treatment-goal-step.component.html',
  styleUrl: './improved-treatment-goal-step.component.scss',
  providers: [
    { provide: StepDirective, useExisting: ImprovedTreatmentGoalStepComponent },
  ],
})
export class ImprovedTreatmentGoalStepComponent extends StepDirective<ScenarioDraftConfiguration> {
  form = new FormGroup({
    treatment_goal: new FormControl<number | null>(null, Validators.required),
  });

  getData() {
    return this.form.value;
  }
}

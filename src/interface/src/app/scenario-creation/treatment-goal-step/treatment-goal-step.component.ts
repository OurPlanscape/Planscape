import { Component } from '@angular/core';
import { StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';

@Component({
  selector: 'app-treatment-goal-step',
  standalone: true,
  imports: [TreatmentGoalSelectorComponent],
  templateUrl: './treatment-goal-step.component.html',
  styleUrl: './treatment-goal-step.component.scss',
  providers: [
    { provide: StepDirective, useExisting: TreatmentGoalStepComponent },
  ],
})
export class TreatmentGoalStepComponent extends StepDirective<ScenarioDraftConfiguration> {
  form = new FormGroup({
    treatment_goal: new FormControl<number | null>(null, Validators.required),
  });

  getData() {
    return this.form.value;
  }
}

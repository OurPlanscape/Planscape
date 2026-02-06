import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ScenarioCreation } from '@types';
import { StepDirective } from '@styleguide';
import { STAND_SIZE } from '@plan/plan-helpers';
import { StandSizeSelectorComponent } from '../stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '../treatment-goal-selector/treatment-goal-selector.component';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StandSizeSelectorComponent,
    TreatmentGoalSelectorComponent,
  ],
  providers: [{ provide: StepDirective, useExisting: Step1Component }],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component extends StepDirective<ScenarioCreation> {
  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | undefined>(undefined),
    treatment_goal: new FormControl<number | undefined>(undefined),
  });

  getData() {
    console.log('[Step1] getData called', {
      formValid: this.form.valid,
      formErrors: this.form.errors,
      standSizeErrors: this.form.get('stand_size')?.errors,
      treatmentGoalErrors: this.form.get('treatment_goal')?.errors,
    });
    return this.form.value;
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StepDirective } from '@styleguide';
import { STAND_SIZE } from '@plan/plan-helpers';
import { StandSizeSelectorComponent } from '../stand-size-selector/stand-size-selector.component';
import { TreatmentGoalSelectorComponent } from '../treatment-goal-selector/treatment-goal-selector.component';
import { ScenarioDraftConfiguration } from '@types';

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
export class Step1Component extends StepDirective<ScenarioDraftConfiguration> {
  form = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | null>(null, Validators.required),
    treatment_goal: new FormControl<number | null>(null, Validators.required),
  });

  getData() {
    return this.form.value;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormFragment, formFragmentProviders } from '@styleguide';

export interface TreatmentTargetValue {
  maxArea: number | null;
  maxProjectCount: number | null;
  estimatedCost: number | null;
}

/**
 * Simplified treatment-target as a FormFragment.
 * The real component would inject NewScenarioState for dynamic validation.
 */
@Component({
  selector: 'app-treatment-target-fragment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: formFragmentProviders(TreatmentTargetFragmentComponent),
  template: `
    <div class="treatment-target">
      <h4>Treatment Target</h4>

      <div class="form-field">
        <label for="maxArea">Max Area (acres) *</label>
        <input
          id="maxArea"
          type="number"
          [formControl]="control.controls.maxArea"
          (blur)="markAsTouched()"
        />
        @if (control.controls.maxArea.touched && control.controls.maxArea.errors?.['required']) {
          <span class="error">Required</span>
        }
      </div>

      <div class="form-field">
        <label for="maxProjectCount">Max Project Count *</label>
        <input
          id="maxProjectCount"
          type="number"
          [formControl]="control.controls.maxProjectCount"
          (blur)="markAsTouched()"
        />
        @if (control.controls.maxProjectCount.touched && control.controls.maxProjectCount.errors?.['required']) {
          <span class="error">Required</span>
        }
      </div>

      <div class="form-field">
        <label for="estimatedCost">Estimated Cost ($/acre) *</label>
        <input
          id="estimatedCost"
          type="number"
          [formControl]="control.controls.estimatedCost"
          (blur)="markAsTouched()"
        />
        @if (control.controls.estimatedCost.touched && control.controls.estimatedCost.errors?.['required']) {
          <span class="error">Required</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .treatment-target {
        padding: 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
      }
      .error {
        color: red;
        font-size: 12px;
      }
    `,
  ],
})
export class TreatmentTargetFragmentComponent extends FormFragment<TreatmentTargetValue> {
  control = new FormGroup({
    maxArea: new FormControl<number | null>(null, Validators.required),
    maxProjectCount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    estimatedCost: new FormControl<number | null>(1500, [
      Validators.required,
      Validators.min(1),
    ]),
  });
}

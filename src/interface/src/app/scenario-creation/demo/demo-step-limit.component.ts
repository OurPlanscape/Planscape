import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormFragment, formFragmentProviders } from '@styleguide';

export interface LimitValue {
  min: number | null;
  max: number | null;
}

@Component({
  selector: 'app-demo-step-limit-4',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: formFragmentProviders(DemoStepLimitComponent),
  template: `
    <div class="limit-fields">
      <div class="form-field">
        <label for="min">Min (optional)</label>
        <input
          id="min"
          type="number"
          [formControl]="control.controls.min"
          (blur)="markAsTouched()"
          placeholder="Min value"
        />
      </div>
      <div class="form-field">
        <label for="max">Max (required)</label>
        <input
          id="max"
          type="number"
          [formControl]="control.controls.max"
          (blur)="markAsTouched()"
          placeholder="Max value"
        />
        @if (control.controls.max.touched && control.controls.max.errors?.['required']) {
          <span class="error">Max is required</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .limit-fields {
        display: flex;
        gap: 16px;
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
export class DemoStepLimitComponent extends FormFragment<LimitValue> {
  // FormGroup also works
  control = new FormGroup({
    min: new FormControl<number | null>(null),
    max: new FormControl<number | null>(null, Validators.required),
  });
}

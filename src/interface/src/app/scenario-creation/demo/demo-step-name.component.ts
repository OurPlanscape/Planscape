import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormFragment, formFragmentProviders } from '@styleguide';

@Component({
  selector: 'app-demo-step-name-4',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: formFragmentProviders(DemoStepNameComponent),
  template: `
    <div class="form-field">
      <label for="name">Name (required)</label>
      <input
        id="name"
        type="text"
        [formControl]="control"
        (blur)="markAsTouched()"
        placeholder="Enter name"
      />
      @if (control.touched && control.errors?.['required']) {
        <span class="error">Name is required</span>
      }
    </div>
  `,
  styles: [
    `
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
export class DemoStepNameComponent extends FormFragment<string> {
  // Just this! The rest comes from the base class
  control = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
}

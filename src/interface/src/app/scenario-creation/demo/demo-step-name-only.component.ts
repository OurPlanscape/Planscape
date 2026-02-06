import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StepDirective } from '@styleguide';
import { DemoStepNameComponent } from './demo-step-name.component';

export interface DemoStepNameOnlyData {
  name: string;
}

@Component({
  selector: 'app-demo-step-name-only',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DemoStepNameComponent],
  providers: [{ provide: StepDirective, useExisting: DemoStepNameOnlyComponent }],
  template: `
    <h3>Demo Step with only name</h3>

    <app-demo-step-name-4 formControlName="name"></app-demo-step-name-4>

    <hr />
    <pre>Form value: {{ form.value | json }}</pre>
    <pre>Form valid: {{ form.valid }}</pre>
  `,
})
export class DemoStepNameOnlyComponent extends StepDirective<DemoStepNameOnlyData> {
  form = new FormGroup({
    name: new FormControl<string>(''),
  });

  getData(): DemoStepNameOnlyData {
    return this.form.getRawValue() as DemoStepNameOnlyData;
  }
}

import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StepDirective } from '@styleguide';
import { DemoStepNameComponent } from './demo-step-name.component';
import {
  TreatmentTargetFragmentComponent,
  TreatmentTargetValue,
} from './treatment-target-fragment.component';

export interface DemoStepWithTreatmentData {
  name: string;
  treatmentTarget: TreatmentTargetValue;
}

@Component({
  selector: 'app-demo-step-with-treatment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DemoStepNameComponent,
    TreatmentTargetFragmentComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: DemoStepWithTreatmentComponent },
  ],
  template: `
    <h3>Demo Step with Name + Treatment Target</h3>

    <app-demo-step-name-4 formControlName="name"></app-demo-step-name-4>
    <app-treatment-target-fragment formControlName="treatmentTarget"></app-treatment-target-fragment>

    <hr />
    <pre>Form value: {{ form.value | json }}</pre>
    <pre>Form valid: {{ form.valid }}</pre>
  `,
})
export class DemoStepWithTreatmentComponent extends StepDirective<DemoStepWithTreatmentData> {
  form = new FormGroup({
    name: new FormControl<string>(''),
    treatmentTarget: new FormControl<TreatmentTargetValue>({
      maxArea: null,
      maxProjectCount: null,
      estimatedCost: 1500,
    }),
  });

  getData(): DemoStepWithTreatmentData {
    return this.form.getRawValue() as DemoStepWithTreatmentData;
  }
}

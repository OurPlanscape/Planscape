import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StepDirective } from '@styleguide';
import { DemoStepNameComponent } from './demo-step-name.component';
import { DemoStepLimitComponent, LimitValue } from './demo-step-limit.component';

export interface DemoStepData {
  name: string;
  limit: LimitValue;
}

@Component({
  selector: 'app-demo-step-4',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DemoStepNameComponent,
    DemoStepLimitComponent,
  ],
  providers: [{ provide: StepDirective, useExisting: DemoStepComponent }],
  template: `
    <h3>Demo Step con FormFragment base class</h3>

    <!-- Used like any form control -->
    <app-demo-step-name-4 formControlName="name"></app-demo-step-name-4>
    <app-demo-step-limit-4 formControlName="limit"></app-demo-step-limit-4>

    <hr />
    <pre>Form value: {{ form.value | json }}</pre>
    <pre>Form valid: {{ form.valid }}</pre>
  `,
})
export class DemoStepComponent extends StepDirective<DemoStepData> {
  form = new FormGroup({
    name: new FormControl<string>(''),
    limit: new FormControl<LimitValue>({ min: null, max: null }),
  });

  getData(): DemoStepData {
    return this.form.getRawValue() as DemoStepData;
  }
}

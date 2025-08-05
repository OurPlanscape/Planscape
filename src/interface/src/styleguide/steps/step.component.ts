import { Component, ContentChild, Directive } from '@angular/core';
import { CdkStep, CdkStepperModule } from '@angular/cdk/stepper';
import { FormGroup } from '@angular/forms';

type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> | null : T[K] | null;
};

@Directive({
  selector: '[sgStepLogic]', // must exist!
  standalone: true,
})
export abstract class StepDirective<T> {
  abstract form: FormGroup;

  abstract getData(): PartialDeep<T>;
}

@Component({
  selector: 'sg-step',
  template: ` <ng-template>
    <ng-content></ng-content>
  </ng-template>`,
  imports: [CdkStepperModule],
  providers: [{ provide: CdkStep, useExisting: StepComponent }],
  standalone: true,
})
export class StepComponent<T> extends CdkStep {
  @ContentChild(StepDirective) stepLogic?: StepDirective<T>;

  getData(): PartialDeep<T> {
    return this.stepLogic?.getData() || {};
  }
}

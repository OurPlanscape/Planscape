import {
  AfterViewInit,
  Component,
  ContentChild,
  Directive,
} from '@angular/core';
import { CdkStep, CdkStepperModule } from '@angular/cdk/stepper';
import { FormGroup } from '@angular/forms';
import { PartialDeep } from '@types';

@Directive({
  selector: '[sgStepLogic]',
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
export class StepComponent<T> extends CdkStep implements AfterViewInit {
  @ContentChild(StepDirective) stepLogic?: StepDirective<T>;

  ngAfterViewInit() {
    if (!this.stepLogic) {
      throw new Error(
        'StepComponent: No step logic (StepDirective) was projected into this step.'
      );
    }
  }

  getData(): PartialDeep<T> {
    return this.stepLogic?.getData() || {};
  }

  get form() {
    return this.stepLogic?.form;
  }
}

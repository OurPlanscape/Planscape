import { Component, ContentChild, Directive } from '@angular/core';
import { CdkStep, CdkStepperModule } from '@angular/cdk/stepper';
import { FormGroup } from '@angular/forms';

@Directive()
export abstract class StepDirective<T> {
  abstract form: FormGroup;

  abstract getData(): Partial<T>;
}

@Component({
  selector: 'sg-step',
  template: ` <ng-template cdkStepContent>
    <ng-content></ng-content>
  </ng-template>`,
  imports: [CdkStepperModule],
  providers: [{ provide: CdkStep, useExisting: StepComponent }],
  standalone: true,
})
export class StepComponent extends CdkStep {
  @ContentChild(StepDirective) stepLogic?: StepDirective<any>;

  getData(): Partial<any> | undefined {
    console.log('this.stepLogic', this.stepLogic);
    return this.stepLogic?.getData();
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { Observable } from 'rxjs';
import { FormGroup } from '@angular/forms';

export interface Step {
  form: FormGroup;
}

/**
 * Steps component implementing [CDKStepper](https://v16.material.angular.dev/cdk/stepper/overview).
 * Similar to the Angular Material component, it manages flow based on individual
 * [forms for each step](https://v16.material.angular.dev/components/stepper/overview#using-a-different-form-for-each-step).
 *
 * If you provide a step with a form, it checks its validity to figure out if we can go to the next step.
 * You can make steps optional by setting your own form validity.
 *
 * ```
 * <sg-steps>
 *   <cdk-step>Simple step, no form</cdk-step>
 *   <cdk-step [stepControl]='step1.form'><step-1 #step1></step-1></cdk-step>
 *   <cdk-step [stepControl]='step2.form'><step-2 #step2></step-1></cdk-step>
 * </sg-steps>
 *```
 */
@Component({
  selector: 'sg-steps',
  standalone: true,
  imports: [CommonModule, ButtonComponent, CdkStepperModule],
  providers: [{ provide: CdkStepper, useExisting: StepsComponent }],
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss',
})
export class StepsComponent<T> extends CdkStepper {
  @Input() backLabel = 'Back';
  @Input() continueLabel = 'Save & Continue';
  @Input() finishLabel = 'finish';
  @Input() genericErrorMsg = 'Unknown error';

  savingStep = false;

  // I don't love this...
  // alt would be to use a service but how do I provide the right
  // dependencies on the constructor to extend CdkStepper?
  @Input() save?: (data: Partial<T>) => Observable<boolean>;

  goNext(): void {
    // this would be the key to interact - use the forms
    const control = this.selected?.stepControl;

    // if no control go ahead
    if (!control) {
      this.next();
      return;
    }

    if (control.valid) {
      // async
      if (this.save) {
        this.savingStep = true;
        this.save(control.value).subscribe({
          next: () => {
            this.next();
            this.savingStep = false;
          },
          error: (err) => {
            control.setErrors({
              invalid: err?.message || this.genericErrorMsg,
            });
            this.savingStep = false;
          },
        });
      } else {
        this.next();
      }
    } else {
      this.selected?.stepControl.markAsDirty();
    }
  }

  goBack(): void {
    this.previous();
  }
}

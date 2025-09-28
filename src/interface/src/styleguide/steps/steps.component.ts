import {
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { Observable, take } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { Directionality } from '@angular/cdk/bidi';
import { ButtonComponent } from '../button/button.component';
import { StepComponent } from './step.component';
import { FeatureService } from 'src/app/features/feature.service';

/**
 * Steps component implementing [CDKStepper](https://v16.material.angular.dev/cdk/stepper/overview).
 * Similar to the Angular Material component, it manages flow based on individual
 * [forms for each step](https://v16.material.angular.dev/components/stepper/overview#using-a-different-form-for-each-step).
 *
 * If you provide a step with a form, it checks its validity to figure out if we can go to the next step.
 * You can make steps optional by setting your own form validity.
 *
 * This can be used with `cdk-step` or `sg-step` as steps
 *
 * ```
 * <sg-steps [save]='saveData'>
 *   <cdk-step>Simple step, no form</cdk-step>
 *   <cdk-step [stepControl]='step1.form'><step-1 #step1></step-1></cdk-step>
 *   <sg-step><step-2></step-2></cdk-step>
 * </sg-steps>
 *```
 *
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
  @Input() errorKey = 'invalid';
  // save callback
  @Input() save?: (data: Partial<T>) => Observable<boolean>;
  // outer form, optional, that should check validity / mark as touched when saving
  @Input() outerForm?: FormGroup;
  // event that emits after saving the last step
  @Output() finished = new EventEmitter();

  @Input() savingStep = false;

  @ContentChildren(StepComponent) stepsComponents!: QueryList<StepComponent<T>>;

  allPatchesSuccessful = false;

  constructor(
    dir: Directionality,
    cdr: ChangeDetectorRef,
    el: ElementRef,
    private featureService: FeatureService
  ) {
    super(dir, cdr, el);
  }

  goNext(): void {
    const currentStep = this.selected;
    let outerFormValid = true;

    // grab the control (formControl) from the selected step
    const control =
      currentStep instanceof StepComponent
        ? currentStep.form
        : currentStep?.stepControl;

    // if no control go ahead to the next step
    if (!control) {
      this.moveNextOrFinish();
      return;
    }
    if (this.outerForm && this.outerForm.invalid) {
      this.outerForm.markAllAsTouched();
      outerFormValid = false;
    }

    if (currentStep && control.valid && outerFormValid) {
      // async
      if (this.save) {
        const data =
          currentStep instanceof StepComponent
            ? currentStep.getData()
            : control.value;

        this.save(data)
          .pipe(take(1))
          .subscribe({
            next: (result) => {
              if (this.isLastStep) {
                this.allPatchesSuccessful = true;
              }
              this.moveNextOrFinish();
            },
            error: (err) => {
              control.setErrors({
                [this.errorKey]: err?.message || this.genericErrorMsg,
              });
            },
          });
      } else {
        this.moveNextOrFinish();
      }
    } else {
      control.markAllAsTouched();
    }
  }

  private moveNextOrFinish() {
    if (this.outerForm && this.outerForm.invalid) {
      this.outerForm.markAllAsTouched();
      return;
    }

    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      // for this..we want to still call next, and then only call finished.
      this.next();
      //TODO, ensure this PATCH was successful, then...
      if (this.isLastStep && this.allPatchesSuccessful) {
        this.finished.emit();
      }
    } else {
      if (this.isLastStep) {
        this.finished.emit();
      } else {
        this.next();
      }
    }
  }

  goBack(): void {
    this.previous();
  }

  get isLastStep() {
    return this.selectedIndex === this.steps.length - 1;
  }
}

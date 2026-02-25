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
import { ButtonComponent } from '@styleguide/button/button.component';
import { StepComponent } from './step.component';
import { ScrollingModule } from '@angular/cdk/scrolling';

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
  imports: [CommonModule, ButtonComponent, CdkStepperModule, ScrollingModule],
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
  @Input() showActions = true;

  @Input() showStepIndex = true;
  @Input() showClearButton = false;

  // save callback
  @Input() save?: (data: Partial<T>) => Observable<boolean>;
  // outer form, optional, that should check validity / mark as touched when saving
  @Input() outerForm?: FormGroup;
  // event that emits after saving the last step
  @Output() finished = new EventEmitter();
  @Output() clearClick = new EventEmitter<void>();

  @Input() savingStep = false;
  @Input() disabled = false;

  @ContentChildren(StepComponent) stepsComponents!: QueryList<StepComponent<T>>;

  constructor(dir: Directionality, cdr: ChangeDetectorRef, el: ElementRef) {
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
            next: (moveNext) => {
              if (moveNext) {
                this.moveNextOrFinish();
              }
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
      const firstInvalid = document.querySelector('.ng-invalid:not(form)');
      firstInvalid?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private moveNextOrFinish() {
    const currentStep = this.selected;
    if (this.outerForm && this.outerForm.invalid) {
      this.outerForm.markAllAsTouched();
      return;
    }

    // call the beforeStepExit function for any cleanup
    if (currentStep instanceof StepComponent && currentStep.stepLogic) {
      currentStep.stepLogic.beforeStepExit();
    }

    if (this.isLastStep) {
      this.finished.emit();
    } else {
      this.next();
    }
  }

  goBack(): void {
    const currentStep = this.selected;
    if (currentStep instanceof StepComponent && currentStep.stepLogic) {
      currentStep.stepLogic.beforeStepExit();
    }
    this.previous();
  }

  get isLastStep() {
    return this.selectedIndex === this.steps.length - 1;
  }

  get isOnPreStep(): boolean {
    const current = this.steps.toArray()[this.selectedIndex];
    return current instanceof StepComponent && current.preStep;
  }

  get navSelectedIndex(): number {
    let preStepsBefore = 0;
    this.steps
      .toArray()
      .slice(0, this.selectedIndex)
      .forEach((step) => {
        if (step instanceof StepComponent && step.preStep) preStepsBefore++;
      });
    return this.selectedIndex - preStepsBefore;
  }
}

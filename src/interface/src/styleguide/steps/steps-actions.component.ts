import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@styleguide/button/button.component';

/**
 * Presentational step actions component that displays navigation buttons and step counter.
 * This component is designed to work independently and can be placed anywhere in the layout.
 *
 * Usage:
 * ```html
 * <sg-steps-actions
 *   [currentStep]="stepper.selectedIndex"
 *   [totalSteps]="stepper.steps.length"
 *   [canGoBack]="stepper.selectedIndex > 0"
 *   [canGoNext]="true"
 *   [isLastStep]="stepper.selectedIndex === stepper.steps.length - 1"
 *   [loading]="saving"
 *   (back)="stepper.previous()"
 *   (next)="stepper.next()">
 * </sg-steps-actions>
 * ```
 */
@Component({
  selector: 'sg-steps-actions',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './steps-actions.component.html',
  styleUrls: ['./steps-actions.component.scss'],
})
export class StepsActionsComponent {
  @Input() currentStep = 0;
  @Input() totalSteps = 0;
  @Input() canGoBack = false;
  @Input() canGoNext = true;
  @Input() isLastStep = false;
  @Input() loading = false;
  @Input() showStepCount = true;
  @Input() showBack = true;
  @Input() showContinue = true;
  @Input() backLabel = 'Back';
  @Input() continueLabel = 'Save & Continue';
  @Input() finishLabel = 'Finish';
  @Output() back = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  onBack(): void {
    if (this.canGoBack && !this.loading) {
      this.back.emit();
    }
  }

  onNext(): void {
    if (this.canGoNext && !this.loading) {
      this.next.emit();
    }
  }
}

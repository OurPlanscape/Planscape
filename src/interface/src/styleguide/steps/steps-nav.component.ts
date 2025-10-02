import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface StepConfig {
  label: string;
  completed?: boolean;
  optional?: boolean;
  editable?: boolean;
}

/**
 * Presentational step navigation component that displays a horizontal step progress indicator.
 * This component is designed to work independently and can be coordinated with sg-steps or
 * used standalone with custom step logic.
 *
 * Usage with sg-steps:
 * ```html
 * <sg-steps-nav
 *   [steps]="stepsList"
 *   [selectedIndex]="stepper.selectedIndex"
 *   [linear]="stepper.linear"
 *   (selectionChange)="stepper.selectedIndex = $event">
 * </sg-steps-nav>
 *
 * <sg-steps #stepper>
 *   <cdk-step label="Step 1">...</cdk-step>
 *   <cdk-step label="Step 2">...</cdk-step>
 * </sg-steps>
 * ```
 *
 * Standalone usage:
 * ```html
 * <sg-steps-nav
 *   [steps]="[{label: 'Setup'}, {label: 'Configure'}, {label: 'Review'}]"
 *   [selectedIndex]="currentStep"
 *   (selectionChange)="onStepChange($event)">
 * </sg-steps-nav>
 * ```
 */
@Component({
  selector: 'sg-steps-nav',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './steps-nav.component.html',
  styleUrls: ['./steps-nav.component.scss'],
})
export class StepsNavComponent {
  @Input() steps: StepConfig[] = [];
  @Input() selectedIndex = 0;
  @Input() linear = false;
  @Input() allowNavigation = true;
  @Output() selectionChange = new EventEmitter<number>();

  get displaySteps(): StepConfig[] {
    return this.steps;
  }

  get latestStep(): number {
    let latest = 0;
    this.steps.forEach((step, index) => {
      if (step.completed) {
        latest = Math.max(latest, index);
      }
    });
    return latest;
  }

  getStepState(index: number): 'completed' | 'current' | 'future' {
    if (index < this.selectedIndex) {
      return 'completed';
    } else if (index === this.selectedIndex) {
      return 'current';
    } else {
      return 'future';
    }
  }

  isStepCompleted(index: number): boolean {
    const step = this.steps[index];
    return step?.completed || false;
  }

  isStepCurrent(index: number): boolean {
    return index === this.selectedIndex;
  }

  isStepClickable(index: number): boolean {
    if (!this.allowNavigation) return false;

    const step = this.steps[index];
    if (!step) return false;

    if (this.linear) {
      return index <= this.latestStep + 1;
    }

    return step.editable !== false || step.optional || index <= this.latestStep + 1;
  }

  onStepClick(index: number): void {
    if (this.isStepClickable(index) && index !== this.selectedIndex) {
      this.selectionChange.emit(index);
    }
  }

  getStepLabel(index: number): string {
    const step = this.steps[index];
    return step?.label || `Step ${index + 1}`;
  }
}

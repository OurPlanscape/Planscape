import { Component, Input, Optional, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CdkStepper } from '@angular/cdk/stepper';

@Component({
  selector: 'sg-steps-nav',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './steps-nav.component.html',
  styleUrls: ['./steps-nav.component.scss'],
})
export class StepsNavComponent implements OnInit {
  @Input() allowNavigation = true;
  @Input() stepper?: CdkStepper;

  private _stepper!: CdkStepper;

  constructor(
    @Optional() @Inject(CdkStepper) private parentStepper: CdkStepper | null
  ) {
    // Parent stepper will be set in ngOnInit
  }

  ngOnInit() {
    // Use input stepper if provided, otherwise use parent
    this._stepper = this.stepper || this.parentStepper!;
    if (!this._stepper) {
      console.error(
        'sg-steps-nav: No stepper found. Must be used inside sg-steps or with [stepper] input'
      );
    }
  }

  get displaySteps() {
    return this._stepper?.steps || [];
  }

  get selectedIndex(): number {
    return this._stepper?.selectedIndex || 0;
  }

  set selectedIndex(index: number) {
    if (this._stepper) {
      this._stepper.selectedIndex = index;
    }
  }

  get latestStep(): number {
    let latest = 0;
    this.displaySteps.forEach((step, index) => {
      if (!step.hasError && step.completed) {
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
    const step = this.displaySteps.get(index);
    return step ? step.completed && !step.hasError : false;
  }

  isStepCurrent(index: number): boolean {
    return index === this.selectedIndex;
  }

  isStepClickable(index: number): boolean {
    if (!this.allowNavigation) return false;

    const step = this.displaySteps.get(index);
    if (!step) return false;

    if (this._stepper.linear) {
      return index <= this.latestStep;
    }

    return step.editable || step.optional || index <= this.latestStep;
  }

  onStepClick(index: number): void {
    if (this.isStepClickable(index) && index !== this.selectedIndex) {
      this.selectedIndex = index;
    }
  }

  getStepLabel(index: number): string {
    const step = this.displaySteps.get(index);
    return step?.label || `Step ${index + 1}`;
  }
}

import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface StepperStep {
  label: string;
  id?: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'sg-progress-stepper',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.scss'],
})
export class ProgressStepperComponent implements OnInit, OnChanges {
  @Input() steps: StepperStep[] = [];
  @Input() currentStep = 0;
  @Input() latestStep = 0;
  @Input() allowNavigation = true;
  @Output() stepChange = new EventEmitter<number>();

  displaySteps: StepperStep[] = [];

  ngOnInit(): void {
    this.updateDisplaySteps();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps'] || changes['currentStep'] || changes['latestStep']) {
      this.updateDisplaySteps();
    }
  }

  private updateDisplaySteps(): void {
    this.displaySteps = this.steps.map((step, index) => ({
      ...step,
      disabled: this.allowNavigation ? index > this.latestStep : true,
    }));
  }

  getStepState(index: number): 'completed' | 'current' | 'future' {
    if (index < this.currentStep) {
      return 'completed';
    } else if (index === this.currentStep) {
      return 'current';
    } else {
      return 'future';
    }
  }

  isStepCompleted(index: number): boolean {
    return index < this.latestStep;
  }

  isStepCurrent(index: number): boolean {
    return index === this.currentStep;
  }

  isStepClickable(index: number): boolean {
    return this.allowNavigation && index <= this.latestStep;
  }

  onStepClick(index: number): void {
    if (this.isStepClickable(index) && index !== this.currentStep) {
      this.currentStep = index;
      this.stepChange.emit(index);
    }
  }

  next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepChange.emit(this.currentStep);
    }
  }

  previous(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.stepChange.emit(this.currentStep);
    }
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
      this.stepChange.emit(index);
    }
  }

  canGoNext(): boolean {
    return this.currentStep < this.steps.length - 1;
  }

  canGoPrevious(): boolean {
    return this.currentStep > 0;
  }
}

import {
  AfterViewInit,
  Component,
  ComponentRef,
  Input,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

// BASIC INTERFACE FOR STEPS
export interface StepComponent<T> {
  isValid(): boolean;

  showErrors(): void;

  getData(): Partial<T>;
}

export interface StepConfig<T> {
  label: string;
  component: Type<StepComponent<T>>;
}

@Component({
  selector: 'sg-form-wizard',
  standalone: true,
  template: `
    <div>
      <ng-container #stepHost></ng-container>
      <button (click)="back()" [disabled]="currentStep === 0">Back</button>
      <button (click)="next()">Next</button>
    </div>
  `,
  imports: [NgComponentOutlet],
})
export class FormWizardComponent<T> implements AfterViewInit {
  @ViewChild('stepHost', { read: ViewContainerRef, static: true })
  stepHost!: ViewContainerRef;

  @Input() steps!: StepConfig<T>[];

  currentStep = 0;
  currentComponentRef!: ComponentRef<StepComponent<T>>;

  ngAfterViewInit() {
    this.loadStep(this.currentStep);
  }

  loadStep(index: number) {
    this.stepHost.clear();
    const stepConfig = this.steps[index];
    this.currentComponentRef = this.stepHost.createComponent(
      stepConfig.component
    );
  }

  next() {
    const instance = this.currentComponentRef.instance;
    if (instance.isValid()) {
      this.currentStep++;
      this.loadStep(this.currentStep);
    } else {
      instance.showErrors();
    }
  }

  back() {
    this.currentStep--;
    this.loadStep(this.currentStep);
  }
}

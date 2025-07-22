import {
  Component,
  ContentChildren,
  QueryList,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { StepTemplateDirective } from './step.directive';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'sg-steps',
  standalone: true,
  imports: [MatStepperModule, NgComponentOutlet, CommonModule, ButtonComponent],
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss',
})
export class StepsComponent {
  @ContentChildren(StepTemplateDirective)
  stepDirs!: QueryList<StepTemplateDirective>;
  @ViewChild(MatStepper) stepper!: MatStepper;

  steps: { label: string; template: TemplateRef<any> }[] = [];

  ngAfterContentInit() {
    this.steps = this.stepDirs.map((dir) => ({
      label: dir.label,
      template: dir.template,
    }));
  }

  goNext() {
    this.stepper.next();
  }

  goBack() {
    this.stepper.previous();
  }

  get currentStep() {
    return this.stepper?.selectedIndex + 1;
  }
}

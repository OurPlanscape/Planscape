import { AfterContentInit, Component, ViewChild } from '@angular/core';
import { Step1Component } from '@app/scenario-creation/step1/step1.component';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@app/scenario-creation/process-overview/process-overview.component';
import { StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { FormGroup } from '@angular/forms';
import { SCENARIO_OVERVIEW_STEPS } from '@app/scenario/scenario.constants';

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [Step1Component, ProcessOverviewComponent],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
  // required to "import" current step1
  providers: [
    { provide: StepDirective, useExisting: Step1WithOverviewComponent },
  ],
})
export class Step1WithOverviewComponent
  extends StepDirective<ScenarioCreation>
  implements AfterContentInit
{
  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;

  // Find Step1
  // TODO- we might want to not do this at all when we implement this step
  // with different order, and remove step1 completely.
  // For now, to avoid duplication, just using step1.
  @ViewChild(Step1Component, { static: true }) inner!: Step1Component;

  ngAfterContentInit() {
    if (!this.inner) {
      throw new Error(
        'Step1WithOverviewComponent: inner Step1Component not found'
      );
    }
  }

  get form(): FormGroup {
    return this.inner!.form;
  }

  getData() {
    return this.inner!.getData();
  }
}

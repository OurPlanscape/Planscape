import { AfterContentInit, Component, ViewChild } from '@angular/core';
import { Step1Component } from '../step1/step1.component';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '../../../styleguide/process-overview/process-overview.component';
import { StepDirective } from '@styleguide';
import { ScenarioCreation } from '@types';
import { FormGroup } from '@angular/forms';

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
  steps: OverviewStep[] = [
    {
      label: 'Treatment Goal',
      description:
        'Select important data layers that will be used throughout the workflow.',
      icon: '/assets/svg/icons/overview/treatment-goal.svg',
    },
    {
      label: 'Exclude Areas',
      description: 'Include and exclude specific areas based on your plan.',
      icon: '/assets/svg/icons/overview/exclude-areas.svg',
    },
    {
      label: 'Stand-level Constraints',
      description:
        'Define the minimum or maximum values for key factors to guide decision-making.',
      icon: '/assets/svg/icons/overview/stand-level.svg',
    },
    {
      label: 'Treatment Target',
      description:
        'Set limits on treatment areas to align with real-world restrictions.',
      icon: '/assets/svg/icons/overview/treatment-target.svg',
    },
    {
      label: 'Generate Output',
      description: 'View scenario results from Forsys.',
      icon: '/assets/svg/icons/overview/generate-output.svg',
    },
  ];

  // Find Step1
  // TODO- we might want to not do this at all when we implement this step
  // with different order, and remove step1 completely.
  // For now, to avoid duplication, just using step1.
  @ViewChild(Step1Component, { static: true }) inner!: Step1Component;

  ngAfterContentInit() {
    if (!this.inner) {
      throw new Error(
        'Step1WithOverviewLogic: inner AppStep1Component not found'
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

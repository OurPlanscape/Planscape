import { Component } from '@angular/core';
import { Step1Component } from '../step1/step1.component';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '../../../styleguide/process-overview/process-overview.component';

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [Step1Component, ProcessOverviewComponent],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
})
export class Step1WithOverviewComponent {
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
}

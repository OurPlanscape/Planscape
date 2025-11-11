import { Component } from '@angular/core';
import {
  StepComponent,
  StepsActionsComponent,
  StepsComponent,
  StepsNavComponent,
} from '@styleguide';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '../../../styleguide/process-overview/process-overview.component';
import { Step1Component } from '../step1/step1.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { FeaturesModule } from '../../features/features.module';
import { StandLevelConstraintsComponent } from '../step3/stand-level-constraints.component';
import { Step2Component } from '../step2/step2.component';
import { Step4LegacyComponent } from '../step4-legacy/step4-legacy.component';
import { TreatmentTargetComponent } from '../treatment-target/treatment-target.component';
import { ScenarioMapComponent } from '../../maplibre-map/scenario-map/scenario-map.component';

@Component({
  selector: 'app-create-scenario',
  standalone: true,
  imports: [
    StepsNavComponent,
    ProcessOverviewComponent,
    StepsActionsComponent,
    Step1Component,
    NgIf,
    AsyncPipe,
    FeaturesModule,
    StandLevelConstraintsComponent,
    Step2Component,
    Step4LegacyComponent,
    StepComponent,
    StepsComponent,
    TreatmentTargetComponent,
    ScenarioMapComponent,
  ],
  templateUrl: './create-scenario.component.html',
  styleUrl: './create-scenario.component.scss',
})
export class CreateScenarioComponent {
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

  currentStep = 0;

  get isFirstStep() {
    return this.currentStep === 0;
  }

  back() {
    this.currentStep--;
  }

  next() {
    this.currentStep++;
  }
}

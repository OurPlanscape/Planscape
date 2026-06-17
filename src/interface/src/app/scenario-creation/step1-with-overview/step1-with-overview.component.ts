import { Component, inject, Input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  OverviewStep,
  ProcessOverviewComponent,
} from '@scenario-creation/process-overview/process-overview.component';
import { StandSizeSelectorComponent } from '@scenario-creation/stand-size-selector/stand-size-selector.component';
import { StepDirective } from '@styleguide';
import { PLANNING_APPROACH, ScenarioDraftConfiguration } from '@types';
import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
  ScenarioStepConfig,
} from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { FeatureService } from '@app/features/feature.service';

type Step1WithOverviewForm = FormGroup<{
  stand_size: FormControl<STAND_SIZE | null>;
  planning_approach: FormControl<PLANNING_APPROACH | null>;
}>;

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
    PlanningApproachComponent,
  ],
  templateUrl: './step1-with-overview.component.html',
  styleUrl: './step1-with-overview.component.scss',
  providers: [
    { provide: StepDirective, useExisting: Step1WithOverviewComponent },
  ],
})
export class Step1WithOverviewComponent extends StepDirective<ScenarioDraftConfiguration> {
  readonly form: Step1WithOverviewForm = new FormGroup({
    stand_size: new FormControl<STAND_SIZE | null>(null, Validators.required),
    planning_approach: new FormControl<PLANNING_APPROACH | null>(
      null,
      Validators.required
    ),
  });

  @Input() isCustomScenario = false;

  private featureService: FeatureService = inject(FeatureService);

  get steps(): OverviewStep[] {
    return this.removeNonIncludeStepsIfFeatureIsOff(
      this.isCustomScenario
        ? CUSTOM_SCENARIO_OVERVIEW_STEPS
        : SCENARIO_OVERVIEW_STEPS
    );
  }

  // ADD_INCLUDES steps return all when the feature be released
  removeNonIncludeStepsIfFeatureIsOff(steps: ScenarioStepConfig[]) {
    if (!this.featureService.isFeatureEnabled('ADD_INCLUDES')) {
      return steps.filter(
        (s: ScenarioStepConfig) => s.label !== 'Include Areas'
      );
    }
    return steps;
  }

  constructor() {
    super();
  }

  getData() {
    const { stand_size, planning_approach } = this.form.value;
    return { stand_size, planning_approach };
  }
}

import { Component } from '@angular/core';
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
import { SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { FeatureService } from '@features/feature.service';
import { NgIf } from '@angular/common';

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
    NgIf,
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
    planning_approach: new FormControl<PLANNING_APPROACH | null>(null),
  });

  constructor(private featureService: FeatureService) {
    super();
    this.configureConditionalValidators();
  }
  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;

  getData() {
    const { stand_size, planning_approach } = this.form.value;
    return this.isPlanningApproachEnabled
      ? { stand_size, planning_approach }
      : { stand_size };
  }

  get isPlanningApproachEnabled() {
    return this.featureService.isFeatureEnabled('PLANNING_APPROACH');
  }

  /**
   * This method can be removed completely once the 'PLANNING_APPROACH' feature is fully implemented.
   */
  private configureConditionalValidators(): void {
    const { planning_approach } = this.form.controls;
    if (this.isPlanningApproachEnabled) {
      planning_approach.addValidators(Validators.required);
    } else {
      planning_approach.clearValidators();
    }
    planning_approach.updateValueAndValidity({ emitEvent: false });
  }
}

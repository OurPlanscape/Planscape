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
import { TreatmentGoalSelectorComponent } from '@scenario-creation/treatment-goal-selector/treatment-goal-selector.component';
import { StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';
import { SCENARIO_OVERVIEW_STEPS } from '@scenario/scenario.constants';
import { STAND_SIZE } from '@plan/plan-helpers';
import { PlanningApproachComponent } from '@scenario-creation/planning-approach/planning-approach.component';
import { FeatureService } from '@features/feature.service';
import { NgIf } from '@angular/common';

type Step1WithOverviewForm = FormGroup<{
  stand_size: FormControl<STAND_SIZE | null>;
  treatment_goal: FormControl<number | null>;
  planning_approach: FormControl<string | null>;
}>;

@Component({
  selector: 'app-step1-with-overview',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProcessOverviewComponent,
    StandSizeSelectorComponent,
    TreatmentGoalSelectorComponent,
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
    treatment_goal: new FormControl<number | null>(null),
    planning_approach: new FormControl<string | null>(null),
  });

  constructor(private featureService: FeatureService) {
    super();
    this.configureConditionalValidators();
  }
  steps: OverviewStep[] = SCENARIO_OVERVIEW_STEPS;

  getData() {
    const { stand_size, treatment_goal, planning_approach } = this.form.value;
    return this.isPlanningApproachEnabled
      ? { stand_size, planning_approach }
      : { stand_size, treatment_goal };
  }

  get isPlanningApproachEnabled() {
    return this.featureService.isFeatureEnabled('PLANNING_APPROACH');
  }

  private configureConditionalValidators(): void {
    const { treatment_goal, planning_approach } = this.form.controls;

    if (this.isPlanningApproachEnabled) {
      planning_approach.addValidators(Validators.required);
      treatment_goal.clearValidators();
    } else {
      treatment_goal.addValidators(Validators.required);
      planning_approach.clearValidators();
    }

    treatment_goal.updateValueAndValidity({ emitEvent: false });
    planning_approach.updateValueAndValidity({ emitEvent: false });
  }
}

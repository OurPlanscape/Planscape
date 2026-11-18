import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { StepDirective } from '@styleguide';
import { ScenarioDraftConfiguration } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import { ScenarioSummaryComponent } from '../scenario-summary/scenario-summary.component';

@Component({
  selector: 'app-improved-treatment-goal-step',
  standalone: true,
  imports: [AsyncPipe, ScenarioSummaryComponent],
  templateUrl: './improved-treatment-goal-step.component.html',
  styleUrl: './improved-treatment-goal-step.component.scss',
  providers: [
    { provide: StepDirective, useExisting: ImprovedTreatmentGoalStepComponent },
  ],
})
export class ImprovedTreatmentGoalStepComponent extends StepDirective<ScenarioDraftConfiguration> {
  planningApproach$ = this.newScenarioState.scenarioConfig$.pipe(
    map((config) => config.planning_approach)
  );

  standSize$ = this.newScenarioState.scenarioConfig$.pipe(
    map((config) => config.stand_size ?? null)
  );

  form = new FormGroup({
    treatment_goal: new FormControl<number | null>(null, Validators.required),
  });

  constructor(private newScenarioState: NewScenarioState) {
    super();
  }

  getData() {
    return this.form.value;
  }
}

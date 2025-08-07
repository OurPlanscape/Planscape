import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../../plan/plan.state';

import { map } from 'rxjs';
import { ScenarioState } from '../../scenario/scenario.state';

@Component({
  selector: 'app-view-scenario',
  templateUrl: './view-scenario.component.html',
  styleUrl: './view-scenario.component.scss',
})
export class ViewScenarioComponent {
  planId = this.route.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  plan$ = this.planState.currentPlan$;
  scenario$ = this.scenarioState.currentScenario$;
  scenarioName$ = this.scenario$.pipe(map((s) => s.name));
  scenarioVersion$ = this.scenario$.pipe(map((s) => s.version));
  scenarioResults$ = this.scenario$.pipe(map((s) => s.scenario_result));
  scenarioPriorities$ = this.scenario$.pipe(
    map((s) => s.configuration.treatment_question?.scenario_priorities || [])
  );

  scenarioStatus$ = this.scenario$.pipe(map((s) => s.scenario_result?.status));

  constructor(
    private route: ActivatedRoute,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private router: Router
  ) {}

  goToConfig() {
    this.router.navigate(['plan', this.planId, 'config']);
  }

  goToPlan() {
    this.router.navigate(['/plan', this.planId]);
  }
}

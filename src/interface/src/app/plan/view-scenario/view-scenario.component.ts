import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanState } from '../plan.state';

import { map, skip } from 'rxjs';
import { ScenarioState } from '../../scenario/scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatTabGroup } from '@angular/material/tabs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';

export enum ScenarioTabs {
  RESULTS,
  DATA_LAYERS,
  TREATMENTS,
}

@UntilDestroy()
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

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private route: ActivatedRoute,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private router: Router,
    private dataLayersStateService: DataLayersStateService
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
  }

  goToConfig() {
    this.router.navigate(['plan', this.planId, 'scenario']);
  }

  goToPlan() {
    this.router.navigate(['/plan', this.planId]);
  }
}

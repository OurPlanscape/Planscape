import { Component } from '@angular/core';
import { map } from 'rxjs';
import { PlanState } from '../../plan/plan.state';

import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent } from '@styleguide';

import { NewScenarioState } from '../new-scenario.state';
import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-scenario-legend',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, MatTooltipModule, ButtonComponent, NgIf],
  templateUrl: './scenario-legend.component.html',
  styleUrl: './scenario-legend.component.scss',
})
export class ScenarioLegendComponent {
  $acres = this.planState.currentPlan$.pipe(map((p) => p.area_acres));

  summary$ = this.newScenarioState.availableStands$.pipe(map((s) => s.summary));

  constructor(
    private planState: PlanState,
    private newScenarioState: NewScenarioState
  ) {}
}

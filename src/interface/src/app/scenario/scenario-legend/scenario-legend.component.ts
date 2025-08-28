import { Component } from '@angular/core';
import { map } from 'rxjs';
import { PlanState } from '../../plan/plan.state';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-scenario-legend',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, MatTooltipModule, ButtonComponent],
  templateUrl: './scenario-legend.component.html',
  styleUrl: './scenario-legend.component.scss',
})
export class ScenarioLegendComponent {
  $acres = this.planState.currentPlan$.pipe(map((p) => p.area_acres));

  constructor(private planState: PlanState) {}
}

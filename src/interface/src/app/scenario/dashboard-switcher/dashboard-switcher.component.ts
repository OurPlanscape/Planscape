import { Component } from '@angular/core';
import { ScenarioDashboardComponent } from '../scenario-dashboard/scenario-dashboard.component';
import { ProjectAreaDashboardComponent } from '../project-area-dashboard/project-area-dashboard.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { ScenarioState } from '../scenario.state';

@Component({
  selector: 'app-dashboard-switcher',
  templateUrl: 'dashboard-switcher.component.html',
  standalone: true,

  imports: [
    AsyncPipe,
    NgIf,
    ProjectAreaDashboardComponent,
    ScenarioDashboardComponent,
  ],
})
export class DashboardSwitcherComponent {
  isProjectArea = false;
  currentScenario$ = this.scenarioState.currentScenario$;

  constructor(private scenarioState: ScenarioState) {}
}

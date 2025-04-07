import { Component } from '@angular/core';
import { filter } from 'rxjs';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';

@Component({
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
})
export class ScenarioRoutePlaceholderComponent {
  currentScenarioResource$ = this.scenarioState.currentScenarioResource$.pipe(
    filter((resource) => !resource.isLoading)
  );

  constructor(private scenarioState: ScenarioState) {}
}

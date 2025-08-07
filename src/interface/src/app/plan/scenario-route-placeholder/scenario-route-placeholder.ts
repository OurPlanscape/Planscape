import { Component } from '@angular/core';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { takeWhile } from 'rxjs';

@Component({
  selector: 'app-scenario-route-placeholder',
  templateUrl: './scenario-route-placeholder.component.html',
  styleUrl: './scenario-route-placeholder.component.scss',
})
export class ScenarioRoutePlaceholderComponent {
  currentScenarioResource$ = this.scenarioState.currentScenarioResource$.pipe(
    // complete this stream after the resource is loaded.
    takeWhile((resource) => resource.isLoading, true)
  );

  constructor(private scenarioState: ScenarioState) {
    console.log('this one');
  }
}

import { Component } from '@angular/core';
import { NewScenarioState } from './new-scenario.state';
import { ScenarioState } from './scenario.state';

@Component({
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrl: './scenario.component.scss',
  providers: [NewScenarioState],
})
export class ScenarioComponent {
  scenarioHasResults$ = this.scenarioService.isScenarioSuccessful$;

  constructor(private scenarioService: ScenarioState) {}
}

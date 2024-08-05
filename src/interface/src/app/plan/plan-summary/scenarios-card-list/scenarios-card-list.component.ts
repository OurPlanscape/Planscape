import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';

import { ScenarioRow } from '../saved-scenarios/saved-scenarios.component';
import { Scenario, ScenarioResult } from '@types';
import { ScenarioCardComponent } from '../../../../styleguide/scenario-card/scenario-card.component';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
} from '../../plan-helpers';

@Component({
  selector: 'app-scenarios-card-list',
  standalone: true,
  imports: [ScenarioCardComponent, NgFor],
  templateUrl: './scenarios-card-list.component.html',
  styleUrl: './scenarios-card-list.component.scss',
})
export class ScenariosCardListComponent {
  @Input() scenarios: ScenarioRow[] = [];
  @Input() highlightedScenarioRow: ScenarioRow | null = null;
  @Output() viewScenario = new EventEmitter();
  @Output() selectScenario = new EventEmitter<ScenarioRow>();

  hasResults(scenario: Scenario) {
    return (
      !!scenario.scenario_result &&
      scenario.scenario_result.result?.features?.length > 0
    );
  }

  calculateTotals(results: ScenarioResult) {
    const projectAreas = parseResultsToProjectAreas(results);
    return parseResultsToTotals(projectAreas);
  }

  highlightScenario(row: ScenarioRow): void {
    this.highlightedScenarioRow = row;
    this.selectScenario.emit(row);
  }
}

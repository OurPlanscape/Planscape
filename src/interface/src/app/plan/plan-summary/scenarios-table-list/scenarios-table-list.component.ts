import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ScenarioRow } from '../saved-scenarios/saved-scenarios.component';
import { Scenario, ScenarioResult, ScenarioResultStatus } from '@types';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
} from '../../plan-helpers';
import { FeatureService } from '../../../features/feature.service';

@Component({
  selector: 'app-scenarios-table-list',
  templateUrl: './scenarios-table-list.component.html',
  styleUrls: ['./scenarios-table-list.component.scss'],
})
export class ScenariosTableListComponent {
  @Input() scenarios: ScenarioRow[] = [];
  @Input() highlightedScenarioRow: ScenarioRow | null = null;
  @Output() viewScenario = new EventEmitter();
  @Output() selectScenario = new EventEmitter<ScenarioRow>();

  constructor(private featureService: FeatureService) {}

  statusLabels: Record<ScenarioResultStatus, string> = {
    LOADING: 'Loading',
    NOT_STARTED: 'Not Started',
    PENDING: 'Running',
    RUNNING: 'Running',
    SUCCESS: 'Done',
    FAILURE: 'Failed',
    PANIC: 'Failed',
    TIMED_OUT: 'Failed',
  };

  displayedColumns: string[] = this.featureService.isFeatureEnabled(
    'show_share_modal'
  )
    ? [
        'name',
        'creator',
        'projectAreas',
        'acresTreated',
        'estimatedCost',
        'status',
        'completedTimestamp',
      ]
    : [
        'name',
        'projectAreas',
        'acresTreated',
        'estimatedCost',
        'status',
        'completedTimestamp',
      ];

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

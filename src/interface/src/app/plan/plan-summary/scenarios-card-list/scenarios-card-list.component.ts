import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { ScenarioRow } from '../saved-scenarios/saved-scenarios.component';
import { ScenarioCardComponent } from '../../../../styleguide/scenario-card/scenario-card.component';
import { SharedModule } from '@shared';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
} from '../../plan-helpers';
import { FeatureService } from '../../../features/feature.service';
import { Plan, Scenario, ScenarioResult } from '@types';
import { AuthService } from '@services';

@Component({
  selector: 'app-scenarios-card-list',
  standalone: true,
  imports: [ScenarioCardComponent, NgFor, SharedModule],
  templateUrl: './scenarios-card-list.component.html',
  styleUrl: './scenarios-card-list.component.scss',
})
export class ScenariosCardListComponent {
  selectedCard: ScenarioRow | null = null;
  @Input() scenarios: ScenarioRow[] = [];
  @Input() plan: Plan | null = null;
  @Output() selectScenario = new EventEmitter<ScenarioRow>();
  @Output() viewScenario = new EventEmitter<ScenarioRow>();

  constructor(
    private featureService: FeatureService,
    private authService: AuthService
  ) {}

  treatmentPlansEnabled = this.featureService.isFeatureEnabled('treatments');

  getAreas(scenario: Scenario) {
    return scenario.scenario_result?.result?.features?.length;
  }

  handleClickedScenario(row: ScenarioRow): void {
    if (
      row.scenario_result &&
      ['SUCCESS', 'FAILURE', 'PANIC'].includes(row.scenario_result.status)
    ) {
      this.selectedCard = row;
      this.viewScenario.emit(row);
    }
  }

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

  isSelected(s: ScenarioRow): boolean {
    return this.selectedCard == s;
  }

  userCanArchiveScenario(scenario: Scenario) {
    if (!this.plan) {
      return false;
    }
    const user = this.authService.currentUser();
    return user?.id === this.plan?.user || user?.id == scenario.user;
  }
}

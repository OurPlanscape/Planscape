import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { ScenarioRow } from '../saved-scenarios/saved-scenarios.component';
import { ScenarioCardComponent } from '../../../../styleguide/scenario-card/scenario-card.component';
import {
  SharedModule,
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
} from '@shared';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
} from '../../plan-helpers';
import { FeatureService } from '../../../features/feature.service';
import { Plan, Scenario, ScenarioResult } from '@types';
import { AuthService, ScenarioService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TreatmentsService } from '@services/treatments.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OverlayLoaderComponent } from '../../../../styleguide/overlay-loader/overlay-loader.component';
import { OverlayLoaderService } from '@services/overlay-loader.service';

@Component({
  selector: 'app-scenarios-card-list',
  standalone: true,
  imports: [ScenarioCardComponent, NgFor, SharedModule, OverlayLoaderComponent],
  templateUrl: './scenarios-card-list.component.html',
  styleUrl: './scenarios-card-list.component.scss',
})
export class ScenariosCardListComponent {
  selectedCard: ScenarioRow | null = null;
  @Input() scenarios: ScenarioRow[] = [];
  @Input() plan: Plan | null = null;
  @Output() selectScenario = new EventEmitter<ScenarioRow>();
  @Output() viewScenario = new EventEmitter<ScenarioRow>();
  @Output() triggerRefresh = new EventEmitter<ScenarioRow>();

  constructor(
    private featureService: FeatureService,
    private authService: AuthService,
    private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private treatmentsService: TreatmentsService,
    private router: Router,
    private route: ActivatedRoute,
    private overlayLoaderService: OverlayLoaderService
  ) {}

  treatmentPlansEnabled = this.featureService.isFeatureEnabled('treatments');

  numberOfAreas(scenario: Scenario) {
    return scenario.scenario_result?.result?.features?.length;
  }

  handleOpenScenario(row: ScenarioRow): void {
    if (row.origin === 'USER') {
      // TODO: we should go directly to the plan
      return;
    }

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

  toggleScenarioStatus(scenario: Scenario) {
    if (scenario.id) {
      const originalStatus = scenario.status;
      this.scenarioService.toggleScenarioStatus(Number(scenario.id)).subscribe({
        next: () => {
          this.snackbar.open(
            `"${scenario.name}" has been ${originalStatus === 'ARCHIVED' ? 'restored' : 'archived'}`,
            'Dismiss',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.triggerRefresh.emit();
        },
        error: (err) => {
          this.snackbar.open(
            `Error: ${err.error.error}`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
    }
  }

  openNewTreatment(event: Event, s: Scenario) {
    event.stopPropagation();
    const scenarioId = s.id;
    if (!scenarioId) {
      return;
    }
    this.overlayLoaderService.showLoader();

    this.treatmentsService
      .createTreatmentPlan(Number(scenarioId), 'New Treatment Plan')
      .subscribe({
        next: (result) => {
          this.overlayLoaderService.hideLoader();
          this.router.navigate(['config', scenarioId, 'treatment', result.id], {
            relativeTo: this.route,
          });
        },
        error: () => {
          this.snackbar.open(
            '[Error] Cannot create a new treatment plan',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }
}

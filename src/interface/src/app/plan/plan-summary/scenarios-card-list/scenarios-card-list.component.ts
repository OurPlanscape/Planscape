import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { ScenarioRow } from '@plan/plan-summary/saved-scenarios/saved-scenarios.component';
import { OverlayLoaderComponent, ScenarioCardComponent } from '@styleguide';
import {
  SharedModule,
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
} from '@shared';
import {
  parseResultsToProjectAreas,
  parseResultsToTotals,
} from '@plan/plan-helpers';
import {
  scenarioCanHaveTreatmentPlans,
  suggestUniqueName,
} from '@scenario/scenario-helper';
import { Plan, Scenario, ScenarioResult } from '@types';
import { AuthService, ScenarioService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TreatmentsService } from '@services/treatments.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OverlayLoaderService } from '@services/overlay-loader.service';
import { CreateTreatmentDialogComponent } from '@scenario/create-treatment-dialog/create-treatment-dialog.component';
import { catchError, of, take, map } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AnalyticsService } from '@services/analytics.service';
import {
  canEditScenarioName,
  userCanAddTreatmentPlan,
} from '@plan/permissions';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScenarioSetupModalComponent } from '@scenario/scenario-setup-modal/scenario-setup-modal.component';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';

@Component({
  selector: 'app-scenarios-card-list',
  standalone: true,
  imports: [
    ScenarioCardComponent,
    NgFor,
    SharedModule,
    OverlayLoaderComponent,
    MatTooltipModule,
  ],
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
  @Output() triggerEdit = new EventEmitter();
  @Output() scenarioDeleted = new EventEmitter<ScenarioRow>();

  open_statuses = ['SUCCESS', 'FAILURE', 'PANIC', 'DRAFT'];

  constructor(
    private authService: AuthService,
    private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private treatmentsService: TreatmentsService,
    private router: Router,
    private route: ActivatedRoute,
    private overlayLoaderService: OverlayLoaderService,
    private dialog: MatDialog,
    private analyticsService: AnalyticsService
  ) {}

  numberOfAreas(scenario: Scenario) {
    return scenario.scenario_result?.result?.features?.length;
  }

  isDraft(row: ScenarioRow): boolean {
    return row.scenario_result?.status === 'DRAFT';
  }

  isCreator(row: ScenarioRow, userId?: number): boolean {
    return userId != null && row.user === userId;
  }

  isDraftByOtherUser(row: ScenarioRow, userId?: number): boolean {
    return this.isDraft(row) && !this.isCreator(row, userId);
  }

  canOpenScenario(row: ScenarioRow, userId?: number): boolean {
    const status = row.scenario_result?.status;
    if (!status) return false;

    if (this.isDraftByOtherUser(row, userId)) return false;

    return this.open_statuses.includes(status);
  }

  displayDraftCreatorTooltip(row: ScenarioRow): boolean {
    const userId = this.authService.currentUser()?.id;
    return this.isDraftByOtherUser(row, userId);
  }

  handleOpenScenario(row: ScenarioRow): void {
    const userId = this.authService.currentUser()?.id;
    if (!this.canOpenScenario(row, userId)) return;

    this.selectedCard = row;
    this.viewScenario.emit(row);
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

  // Planning Area Creators and Owners, and Scenario Creators can rename scenarios
  userCanEditScenario(scenario: Scenario) {
    const user = this.authService.currentUser();
    if (!this.plan || !user) {
      return false;
    }
    return user?.id == scenario.user || canEditScenarioName(this.plan, user);
  }

  canShowContextualMenu(scenario: Scenario) {
    const user = this.authService.currentUser();
    if (this.isDraft(scenario)) {
      return user?.id == scenario.user;
    } else {
      return true;
    }
  }

  userCanCreateTreatmentPlan() {
    if (!this.plan) {
      return false;
    }
    return userCanAddTreatmentPlan(this.plan) || false;
  }

  hasTreatmentPlanCapability(scenario: Scenario) {
    return scenarioCanHaveTreatmentPlans(scenario);
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
          this.triggerRefresh.emit(scenario);
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

  showDeleteScenarioDialog(scenario: Scenario) {
    if (scenario.id) {
      this.dialog
        .open(DeleteDialogComponent, {
          data: {
            title: `Delete "${scenario?.name}"?`,
            body: `Are you sure you want to delete this scenario? All configuration details and
                    results will be permanently deleted, and this action cannot be undone.`,
          },
        })
        .afterClosed()
        .pipe(take(1))
        .subscribe((name) => {
          if (name) {
            this.deleteScenario(scenario);
          }
        });
    }
  }

  private deleteScenario(scenario: Scenario) {
    this.scenarioService.deleteScenario(Number(scenario.id)).subscribe({
      next: () => {
        this.snackbar.open(
          `"${scenario.name}" has been deleted`,
          'Dismiss',
          SNACK_BOTTOM_NOTICE_CONFIG
        );
        this.triggerRefresh.emit(scenario);
      },
      error: (err) => {
        this.snackbar.open(
          `Error: Unable to delete ${scenario.name}`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  openNewTreatmentDialog(event: Event, s: Scenario) {
    event.stopPropagation();
    this.analyticsService.emitEvent(
      'new_treatment_plan',
      'scenario_list_page',
      'New Treatment Plan'
    );
    const scenarioId = s.id;
    if (!scenarioId) {
      return;
    }
    this.dialog
      .open(CreateTreatmentDialogComponent)
      .afterClosed()
      .pipe(take(1))
      .subscribe((name) => {
        if (name) {
          this.createTreatmentPlan(scenarioId, name);
        }
      });
  }

  createTreatmentPlan(scenarioId: number, name: string) {
    this.overlayLoaderService.showLoader();

    this.treatmentsService
      .createTreatmentPlan(Number(scenarioId), name)
      .subscribe({
        next: (result) => {
          this.overlayLoaderService.hideLoader();
          this.router.navigate(
            ['scenario', scenarioId, 'treatment', result.id],
            {
              relativeTo: this.route,
            }
          );
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

  editScenario(s: Scenario) {
    if (this.plan) {
      const dialogRef: MatDialogRef<ScenarioSetupModalComponent> =
        this.dialog.open(ScenarioSetupModalComponent, {
          data: {
            planId: this.plan.id,
            fromClone: false,
            scenario: s,
          },
        });
      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe((confirmed) => {
          if (confirmed) {
            this.snackbar.open(
              `Scenario name has been updated`,
              'Dismiss',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            this.triggerEdit.emit(s);
          }
        });
    }
  }

  handleCopyScenario(scenario: Scenario) {
    //open the dialog first, so we have some UX while we wait
    const dialogRef = this.dialog.open(ScenarioSetupModalComponent, {
      maxWidth: '560px',
      data: {
        planId: scenario.planning_area,
        fromClone: true,
        defaultName: null, // initially blank, which disables the form when fromClone
        scenario: scenario,
        type: scenario.type,
      },
    });
    // update with a suggested name once it's available
    this.scenarioService
      .getScenariosForPlan(scenario.planning_area)
      .pipe(
        take(1),
        map((scenarios) => scenarios.map((s) => s.name)),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((existingNames: string[]) => {
        const suggestedName =
          existingNames.length > 0
            ? suggestUniqueName(scenario.name, existingNames)
            : '';
        if (dialogRef.componentInstance) {
          dialogRef.componentInstance.setName(suggestedName);
        }
      });
  }
}

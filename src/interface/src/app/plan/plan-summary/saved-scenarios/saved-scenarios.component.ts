import { Component, Input, OnInit } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, PlanStateService, ScenarioService } from '@services';
import { FeatureService } from '../../../features/feature.service';
import { interval, take } from 'rxjs';
import { Plan, Scenario } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isValidTotalArea, POLLING_INTERVAL } from '../../plan-helpers';
import { MatDialog } from '@angular/material/dialog';

import { canAddScenario } from '../../permissions';
import { SNACK_BOTTOM_NOTICE_CONFIG, SNACK_ERROR_CONFIG } from '@shared';
import { MatTab } from '@angular/material/tabs';
import { UploadProjectAreasModalComponent } from '../../upload-project-areas-modal/upload-project-areas-modal.component';
import { ScenarioCreateConfirmationComponent } from '../../scenario-create-confirmation/scenario-create-confirmation.component';
import { TreatmentsService } from '@services/treatments.service';

export interface ScenarioRow extends Scenario {
  selected?: boolean;
  created_at?: string;
}

@UntilDestroy()
@Component({
  selector: 'app-saved-scenarios',
  templateUrl: './saved-scenarios.component.html',
  styleUrls: ['./saved-scenarios.component.scss'],
})
export class SavedScenariosComponent implements OnInit {
  @Input() plan: Plan | null = null;
  user$ = this.authService.loggedInUser$;

  highlightedScenarioRow: ScenarioRow | null = null;
  loading = true;
  showOnlyMyScenarios: boolean = false;
  activeScenarios: ScenarioRow[] = [];
  archivedScenarios: ScenarioRow[] = [];
  scenariosForUser: ScenarioRow[] = [];
  selectedTabIndex = 0;
  totalScenarios = 0;
  sortSelection = '-created_at';

  treatmentPlansEnabled = this.featureService.isFeatureEnabled('treatments');

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private dialog: MatDialog,
    private featureService: FeatureService,
    private planStateService: PlanStateService,
    private treatmentsService: TreatmentsService
  ) {}

  ngOnInit(): void {
    this.fetchScenarios();
    this.pollForChanges();
  }

  private pollForChanges() {
    // we might want to check if any scenario is still pending in order to poll
    interval(POLLING_INTERVAL)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.fetchScenarios());
  }

  handleSortChange() {
    this.fetchScenarios();
  }

  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

  fetchScenarios(): void {
    this.scenarioService
      .getScenariosForPlan(this.plan?.id!, this.sortSelection)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.totalScenarios = scenarios.length;
        this.scenariosForUser = this.showOnlyMyScenarios
          ? scenarios.filter((s) => s.user === this.user$.value?.id)
          : scenarios;
        const fetchedActiveScenarios = this.scenariosForUser.filter(
          (s) => s.status === 'ACTIVE'
        );
        if (this.listsDiffer(this.activeScenarios, fetchedActiveScenarios)) {
          this.activeScenarios = fetchedActiveScenarios;
        }
        const fetchedArchivedScenarios = this.scenariosForUser.filter(
          (s) => s.status === 'ARCHIVED'
        );
        if (
          this.listsDiffer(this.archivedScenarios, fetchedArchivedScenarios)
        ) {
          this.archivedScenarios = fetchedArchivedScenarios;
        }
        this.loading = false;
      });
  }

  get canAddScenarioForPlan(): boolean {
    if (!this.plan) {
      return false;
    }
    return canAddScenario(this.plan);
  }

  get showArchiveScenario() {
    if (!this.plan) {
      return false;
    }
    // Users that can add scenarios can potentially archive them.
    // Users that cannot add scenarios can never archive/restore.
    return this.plan.permissions.includes('add_scenario');
  }

  //TODO: Remove this when we permanently switch to new_planning_area
  get canArchiveScenario() {
    if (!this.plan || !this.highlightedScenarioRow) {
      return false;
    }
    const user = this.authService.currentUser();
    return (
      user?.id === this.plan.user ||
      user?.id == this.highlightedScenarioRow?.user
    );
  }

  openConfig(configId?: number): void {
    if (!configId) {
      this.router.navigate(['config', ''], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['config', configId], { relativeTo: this.route });
    }
  }

  viewScenario(): void {
    // Updating planstate with the selected scenario name and ID
    if (this.highlightedScenarioRow) {
      this.planStateService.updateStateWithScenario(
        this.highlightedScenarioRow.id,
        this.highlightedScenarioRow.name
      );
    }
    this.router.navigate(['config', this.highlightedScenarioRow?.id], {
      relativeTo: this.route,
    });
  }

  navigateToScenario(clickedScenario: ScenarioRow): void {
    this.planStateService.updateStateWithScenario(
      clickedScenario.id,
      clickedScenario.name
    );
    this.router.navigate(['config', clickedScenario.id], {
      relativeTo: this.route,
    });
  }

  highlightScenario(row: ScenarioRow): void {
    this.highlightedScenarioRow = row;
  }

  //TODO: Remove this from here we permanently switch to new_planning_area
  toggleScenarioStatus(archive: boolean) {
    const id = this.highlightedScenarioRow?.id;

    if (id) {
      this.scenarioService.toggleScenarioStatus(Number(id)).subscribe({
        next: () => {
          this.snackbar.open(
            `"${this.highlightedScenarioRow?.name}" has been ${
              archive ? 'archived' : 'restored'
            }`,
            'Dismiss',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.highlightedScenarioRow = null;
          this.fetchScenarios();
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

  tabChange(data: { index: number; tab: MatTab }) {
    this.selectedTabIndex = data.index;
    // reset selected row when changing tabs.
    this.highlightedScenarioRow = null;
  }

  get isValidPlanningArea() {
    if (!this.plan) {
      return false;
    }
    return isValidTotalArea(this.plan.area_acres);
  }

  openConfirmationDialog(newScenarioResult: any): void {
    this.dialog
      .open(ScenarioCreateConfirmationComponent, {
        data: newScenarioResult,
      })
      .afterClosed()
      .subscribe((response: any) => {
        if (response === true) {
          this.goToTreatmentPlans(newScenarioResult.response?.id);
        }
        //we just close on cancel.
      });
  }

  goToTreatment(id: number) {
    this.router.navigate(['treatment', id], {
      relativeTo: this.route,
    });
  }

  goToTreatmentPlans(scenarioId: string): void {
    this.treatmentsService
      .createTreatmentPlan(Number(scenarioId), 'New Treatment Plan')
      .subscribe({
        next: (result) => {
          this.goToTreatment(result.id);
        },
        error: () => {
          // TODO: handle error here
        },
      });
  }

  openUploadDialog(): void {
    this.dialog
      .open(UploadProjectAreasModalComponent, {
        data: {
          planning_area_name: this.plan?.name,
          planId: this.plan?.id,
        },
      })
      .afterClosed()
      .subscribe((response: any) => {
        if (response) {
          this.openConfirmationDialog(response);
        }
        //TODO: handle error here
      });
  }
}

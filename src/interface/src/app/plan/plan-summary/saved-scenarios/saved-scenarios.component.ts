import { Component, Input, OnInit } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, PlanStateService, ScenarioService } from '@services';
import { interval, take } from 'rxjs';
import { Plan, Scenario } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isValidTotalArea, POLLING_INTERVAL } from '../../plan-helpers';
import { MatDialog } from '@angular/material/dialog';

import { canAddScenario } from '../../permissions';
import { SNACK_ERROR_CONFIG } from '@shared';
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

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private dialog: MatDialog,
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

  openConfig(configId?: number): void {
    if (!configId) {
      this.router.navigate(['config', ''], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['config', configId], { relativeTo: this.route });
    }
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

  openConfirmationDialog(newScenarioResponse: any): void {
    this.dialog
      .open(ScenarioCreateConfirmationComponent, {
        data: newScenarioResponse,
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse) {
          this.createNewTreatmentPlan(newScenarioResponse?.id);
        }
      });
  }

  createNewTreatmentPlan(scenarioId: string): void {
    this.treatmentsService
      .createTreatmentPlan(Number(scenarioId), 'New Treatment Plan')
      .subscribe({
        next: (result) => {
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

  openUploadDialog(): void {
    this.dialog
      .open(UploadProjectAreasModalComponent, {
        data: {
          planning_area_name: this.plan?.name,
          planId: this.plan?.id,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.openConfirmationDialog(res.response);
        }
      });
  }
}

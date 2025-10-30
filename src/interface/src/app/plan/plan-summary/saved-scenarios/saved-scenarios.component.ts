import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ScenarioService } from '@services';
import {
  catchError,
  EMPTY,
  exhaustMap,
  merge,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { Plan, Scenario } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  getPlanPath,
  isValidTotalArea,
  planningAreaMetricsAreReady,
  planningAreaMetricsFailed,
  POLLING_INTERVAL,
} from '../../plan-helpers';
import { MatDialog } from '@angular/material/dialog';

import { canAddScenario } from '../../permissions';
import { SNACK_ERROR_CONFIG } from '@shared';
import { MatTab } from '@angular/material/tabs';
import { UploadProjectAreasModalComponent } from '../../upload-project-areas-modal/upload-project-areas-modal.component';
import { ScenarioCreateConfirmationComponent } from '../../scenario-create-confirmation/scenario-create-confirmation.component';
import { TreatmentsService } from '@services/treatments.service';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { FeatureService } from 'src/app/features/feature.service';
import { ScenarioSetupModalComponent } from 'src/app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { PlanState } from '../../plan.state';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  planId: number | null = null;
  plan: Plan | null = null;
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

  private manualFetch$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private dialog: MatDialog,
    private treatmentsService: TreatmentsService,
    private breadcrumbService: BreadcrumbService,
    private featureService: FeatureService,
    private planState: PlanState
  ) {}

  ngOnInit(): void {
    this.planId = this.route.snapshot.params['planId'];
    this.pollForChanges();
    this.planState.currentPlan$.pipe(untilDestroyed(this)).subscribe((plan) => {
      this.plan = plan;
    });
  }

  private pollForChanges() {
    const poll$ = timer(0, POLLING_INTERVAL).pipe(
      // start a fetch if not already running; ignore extra poll ticks while active
      exhaustMap(() =>
        this.fetchScenarios$().pipe(
          // if a manual trigger arrives, cancel the current poll request
          takeUntil(this.manualFetch$)
        )
      )
    );

    const manual$ = this.manualFetch$.pipe(
      // run immediately; ignore extra manual clicks while one is running
      switchMap(() => this.fetchScenarios$())
    );

    merge(poll$, manual$).pipe(untilDestroyed(this)).subscribe();
  }

  handleSortChange() {
    this.fetchScenarios();
  }

  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

  fetchScenarios(): void {
    this.manualFetch$.next();
  }

  private fetchScenarios$() {
    return this.scenarioService
      .getScenariosForPlan(this.planId!, this.sortSelection)
      .pipe(
        take(1),
        tap((rawScenarios) => {
          // If SCENARIO_DRAFT is disabled we filter the scenarios so we dont display the drafts
          const scenarios = rawScenarios.filter((scenario) =>
            this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')
              ? true
              : scenario.scenario_result?.status !== 'DRAFT'
          );

          this.totalScenarios = scenarios.length;

          this.scenariosForUser = this.showOnlyMyScenarios
            ? scenarios.filter((s) => s.user === this.user$.value?.id)
            : scenarios;

          const fetchedActive = this.scenariosForUser.filter(
            (s) => s.status === 'ACTIVE'
          );
          if (this.listsDiffer(this.activeScenarios, fetchedActive)) {
            this.activeScenarios = fetchedActive;
          }

          const fetchedArchived = this.scenariosForUser.filter(
            (s) => s.status === 'ARCHIVED'
          );
          if (this.listsDiffer(this.archivedScenarios, fetchedArchived)) {
            this.archivedScenarios = fetchedArchived;
          }
          this.loading = false;
        }),

        // keep the poller alive on errors
        catchError(() => {
          this.loading = false;
          return EMPTY;
        })
      );
  }

  removeScenarioFromList(
    scenario: Scenario,
    list: 'activeScenarios' | 'archivedScenarios'
  ) {
    this[list] = this[list].filter((s) => s.id !== scenario.id);
    this.fetchScenarios();
  }

  get canAddScenarioForPlan(): boolean {
    if (!this.plan) {
      return false;
    }
    return canAddScenario(this.plan);
  }

  get planningAreaIsReady() {
    return this.plan && planningAreaMetricsAreReady(this.plan);
  }

  get planningAreaFailed() {
    return this.plan && planningAreaMetricsFailed(this.plan);
  }

  private openScenarioSetupDialog() {
    return this.dialog.open(ScenarioSetupModalComponent, {
      maxWidth: '560px',
      data: {
        planId: this.plan?.id,
        fromClone: false,
      },
    });
  }

  handleNewScenarioButton(configId?: number): void {
    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      this.openScenarioSetupDialog();
    } else {
      this.openConfig(configId);
    }
  }

  openConfig(configId?: number): void {
    if (!configId) {
      this.router.navigate(['scenario'], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['scenario', configId], {
        relativeTo: this.route,
      });
    }
  }

  navigateToScenario(clickedScenario: ScenarioRow): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Scenario: ' + clickedScenario.name,
      backUrl: getPlanPath(clickedScenario.planning_area),
    });

    this.router.navigate(['scenario', clickedScenario.id], {
      relativeTo: this.route,
    });
  }

  tabChange(data: { index: number; tab: MatTab }) {
    this.selectedTabIndex = data.index;
    // reset selected row when changing tabs.
    this.highlightedScenarioRow = null;
  }

  get isValidPlanningArea() {
    if (!this.plan || !this.planningAreaIsReady) {
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

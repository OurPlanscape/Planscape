import { Component, Input, OnInit } from '@angular/core';
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
import { Plan, Scenario, SCENARIO_TYPE } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  getPlanPath,
  isValidTotalArea,
  planningAreaMetricsAreReady,
  planningAreaMetricsFailed,
  POLLING_INTERVAL,
} from '@plan/plan-helpers';
import { MatDialog } from '@angular/material/dialog';
import { SNACK_ERROR_CONFIG } from '@shared';
import { canAddScenario } from '@plan/permissions';
import { UploadProjectAreasModalComponent } from '@plan/upload-project-areas-modal/upload-project-areas-modal.component';
import { ScenarioCreateConfirmationComponent } from '@plan/scenario-create-confirmation/scenario-create-confirmation.component';
import { TreatmentsService } from '@services/treatments.service';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioSetupModalComponent } from '@scenario/scenario-setup-modal/scenario-setup-modal.component';
import { PlanState } from '@plan/plan.state';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BannerComponent, ButtonComponent } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProjectAreasEmptyListComponent } from '@app/scenario/project-areas-empty-list/project-areas-empty-list.component';
import { ScenariosCardListComponent } from '../scenarios-card-list/scenarios-card-list.component';
import { SuccessDialogComponent } from '@styleguide/dialogs/success-dialog/success-dialog.component';
import { ScenariosEmptyListComponent } from '../scenarios-empty-list/scenarios-empty-list.component';

export type ScenarioListMode = 'plan' | 'project-area';

export interface ScenarioRow extends Scenario {
  selected?: boolean;
  created_at?: string;
}

@UntilDestroy()
@Component({
  selector: 'app-scenarios-list',
  standalone: true,
  imports: [
    BannerComponent,
    ButtonComponent,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    NgFor,
    NgIf,
    MatIconModule,
    ProjectAreasEmptyListComponent,
    ScenariosCardListComponent,
    ScenariosEmptyListComponent,
    SuccessDialogComponent,
  ],
  templateUrl: './scenarios-list.component.html',
  styleUrl: './scenarios-list.component.scss',
})
export class ScenariosListComponent implements OnInit {
  planId: number | null = null;
  plan: Plan | null = null;
  user$ = this.authService.loggedInUser$;
  highlightedScenarioRow: ScenarioRow | null = null;
  loading = true;
  activeScenarios: ScenarioRow[] = [];
  selectedTabIndex = 0;
  totalScenarios = 0;
  sortSelection = '-created_at';

  @Input() mode: 'plan' | 'project-area' = 'plan';

  // Only required when mode === 'project-area'.
  @Input() projectAreaId?: number;

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
    private planState: PlanState
  ) {}

  ngOnInit(): void {
    if (this.mode === 'project-area' && this.projectAreaId == null) {
      throw new Error(
        'ScenariosListComponent: projectAreaId is required when mode is "project-area"'
      );
    }

    this.planId = this.route.snapshot.params['planId'];

    this.planState.currentPlan$
      .pipe(untilDestroyed(this))
      .subscribe((plan) => (this.plan = plan));

    this.pollForChanges();
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
    this.sortSelection =
      this.sortSelection === '-created_at' ? 'created_at' : '-created_at';
    this.loading = true;
    this.fetchScenarios();
  }

  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

  fetchScenarios(): void {
    this.manualFetch$.next();
  }

  private fetchScenarios$() {
    const request$ =
      this.mode === 'project-area'
        ? this.scenarioService.getProjectAreaChildScenarios(
            this.projectAreaId!,
            this.sortSelection
          )
        : this.scenarioService.getScenariosForPlan(
            this.planId!,
            this.sortSelection
          );

    return request$.pipe(
      take(1),
      tap((scenarios) => {
        this.totalScenarios = scenarios.length;
        if (this.listsDiffer(this.activeScenarios, scenarios)) {
          this.activeScenarios = scenarios;
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

  removeScenarioFromList(scenario: Scenario, list: 'activeScenarios') {
    this[list] = this[list].filter((s) => s.id !== scenario.id);
    this.fetchScenarios();
  }

  get canAddScenarioForPlan(): boolean {
    return !!this.plan && canAddScenario(this.plan);
  }

  // Check PA for acreage, and if it doesn't have active scenarios
  get planningAreaIsLarge() {
    return this.plan?.map_status === 'OVERSIZE';
  }

  get scenarioDisabledTooltipReason() {
    if (this.planningAreaIsLarge) {
      return 'New Scenario not available';
    } else if (!this.planningAreaIsReady) {
      return 'Your Planning Area is being prepared';
    } else {
      return 'Planning Area is less than 100 acres';
    }
  }

  get planningAreaIsReady() {
    return !!this.plan && planningAreaMetricsAreReady(this.plan);
  }

  get planningAreaFailed() {
    return !!this.plan && planningAreaMetricsFailed(this.plan);
  }

  public openScenarioSetupDialog(type: SCENARIO_TYPE) {
    return this.dialog.open(ScenarioSetupModalComponent, {
      maxWidth: '560px',
      data: {
        planId: this.plan?.id,
        fromClone: false,
        type,
        ...(this.mode === 'project-area'
          ? { parentId: this.projectAreaId }
          : {}),
      },
    });
  }

  navigateToScenario(clickedScenario: ScenarioRow): void {
    const isFinished =
      clickedScenario.scenario_result &&
      ['FAILURE', 'PANIC', 'SUCCESS'].includes(
        clickedScenario.scenario_result.status
      );

    if (this.mode === 'project-area') {
      const base = ['/plan', this.plan!.id, 'scenario', clickedScenario.id];
      this.router.navigate(isFinished ? [...base, 'dashboard'] : base);
      this.breadcrumbService.updateBreadCrumb({
        label: 'Project Area Dashboard',
        backUrl: getPlanPath(clickedScenario.planning_area),
      });
    } else {
      const base = ['scenario', clickedScenario.id];
      this.router.navigate(isFinished ? [...base, 'dashboard'] : base, {
        relativeTo: this.route,
      });
      this.breadcrumbService.updateBreadCrumb({
        label: 'Planning Area Overview',
        backUrl: getPlanPath(clickedScenario.planning_area),
      });
    }
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
      .createTreatmentPlan(Number(scenarioId), { name: 'New Treatment Plan' })
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

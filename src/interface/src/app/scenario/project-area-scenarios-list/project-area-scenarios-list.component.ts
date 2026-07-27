import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { canAddScenario } from '@app/plan/permissions';
import { Plan, Scenario, SCENARIO_TYPE } from '@app/types';
import { ScenarioSetupModalComponent } from '../scenario-setup-modal/scenario-setup-modal.component';
import { ProjectAreasEmptyListComponent } from '../project-areas-empty-list/project-areas-empty-list.component';
import { AuthService, ScenarioService } from '@app/services';
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
import { POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgFor } from '@angular/common';
import { ScenarioCardComponent } from '@styleguide';
import { ScenarioRow } from '@app/plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { SuccessDialogComponent } from '@styleguide/dialogs/success-dialog/success-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-project-area-scenarios-list',
  standalone: true,
  imports: [
    NgFor,
    ProjectAreasEmptyListComponent,
    ScenarioCardComponent,
    SuccessDialogComponent,
  ],
  templateUrl: './project-area-scenarios-list.component.html',
  styleUrl: './project-area-scenarios-list.component.scss',
})
export class ProjectAreaScenariosListComponent implements OnInit {
  @Input({ required: true }) plan!: Plan;
  @Input({ required: true }) projectAreaId!: number;

  user$ = this.authService.loggedInUser$;

  totalScenarios = 0;
  activeScenarios: Scenario[] = [];
  loading: boolean = false;
  sortSelection = '-created_at';

  private manualFetch$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private scenarioService: ScenarioService,
    private dialog: MatDialog
  ) {}

  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

  ngOnInit(): void {
    this.pollForChanges();
  }

  private pollForChanges() {
    const DEBUG_MULTIPLIER = 10; // TODO: remove this
    const poll$ = timer(0, POLLING_INTERVAL * DEBUG_MULTIPLIER).pipe(
      // start a fetch if not already running; ignore extra poll ticks while active
      exhaustMap(() =>
        this.fetchScenarios$().pipe(
          // if a manual trigger arrives, cancel the current poll request
          takeUntil(this.manualFetch$)
        )
      )
    );

    const manual$ = this.manualFetch$.pipe(
      // run immediately. ignore extra manual clicks while one is running
      switchMap(() => this.fetchScenarios$())
    );

    merge(poll$, manual$).pipe(untilDestroyed(this)).subscribe();
  }

  private fetchScenarios$() {
    return this.scenarioService
      .getProjectAreaChildScenarios(this.projectAreaId)
      .pipe(
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

  get canAddScenarios() {
    return this.plan && canAddScenario(this.plan);
  }

  canOpenScenario(row: ScenarioRow, userId?: number): boolean {
    // TODO: update this for child scenarios
    return true;
  }

  handleOpenScenario(row: ScenarioRow): void {
    const userId = this.authService.currentUser()?.id;
    if (!this.canOpenScenario(row, userId)) return;

    // this.selectedCard = row;
    // this.viewScenario.emit(row);
  }

  public openScenarioSetupDialog(type: SCENARIO_TYPE) {
    return this.dialog.open(ScenarioSetupModalComponent, {
      maxWidth: '560px',
      data: {
        planId: this.plan.id,
        fromClone: false,
        type: type,
        parentId: this.projectAreaId,
      },
    });
  }
}

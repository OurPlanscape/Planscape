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
import { getPlanPath, POLLING_INTERVAL } from '@app/plan/plan-helpers';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgFor, NgIf } from '@angular/common';
import { ScenarioRow, ScenariosCardListComponent } from '@app/plan/plan-summary/scenarios-card-list/scenarios-card-list.component';
import { SuccessDialogComponent } from '@styleguide/dialogs/success-dialog/success-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {  Router } from '@angular/router';
import { BreadcrumbService } from '@app/services/breadcrumb.service';

@UntilDestroy()
@Component({
  selector: 'app-project-area-scenarios-list',
  standalone: true,
  imports: [
    ButtonComponent,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    NgFor,
    NgIf,
    MatIconModule,
    ProjectAreasEmptyListComponent,
    ScenariosCardListComponent,
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
    private dialog: MatDialog,
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) { }


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


  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

 handleSortChange() {
    this.sortSelection =
      this.sortSelection === '-created_at' ? 'created_at' : '-created_at';
    this.loading = true;
    this.fetchScenarios();
  }

  fetchScenarios(): void {
    this.manualFetch$.next();
  }

  private fetchScenarios$() {
    return this.scenarioService
      .getProjectAreaChildScenarios(this.projectAreaId, this.sortSelection)
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

  removeScenarioFromList(scenarioRow: ScenarioRow, list: 'activeScenarios') {
    this[list] = this[list].filter((s) => s.id !== scenarioRow.id);
    this.fetchScenarios();
  }
  
  get canAddScenarioForProjectArea() {
  if (!this.plan) {
      return false;
    }
    return canAddScenario(this.plan);
  }


  // Note that this adds the projectAreaId as parent Id
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
  
  navigateToScenario(clickedScenario: ScenarioRow): void {
    if (
      // if the scenario has a result and that result is a finished state (failure, panic, success)...
      clickedScenario.scenario_result &&
      ['FAILURE', 'PANIC', 'SUCCESS'].includes(
        clickedScenario.scenario_result.status
      )
    ) {
      this.router.navigate([
  '/plan', 
  this.plan.id, 
  'scenario', 
  clickedScenario.id, 
  'dashboard'
]);
    } else {
      // otherwise we are still working on it, so we go to the non-dashboard route
     this.router.navigate([
  '/plan', 
  this.plan.id, 
  'scenario', 
  clickedScenario.id, 
]);
    }
    //TODO: is this relevant?
    this.breadcrumbService.updateBreadCrumb({
      label: 'Project Area Dashboard',
      backUrl: `${getPlanPath(clickedScenario.planning_area)}`,
    });
  }


}

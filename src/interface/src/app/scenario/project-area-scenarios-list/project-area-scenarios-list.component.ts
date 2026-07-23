import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { canAddScenario } from '@app/plan/permissions';
import { Plan, Scenario, SCENARIO_TYPE } from '@app/types';
import { ScenarioSetupModalComponent } from '../scenario-setup-modal/scenario-setup-modal.component';
import { ProjectAreasEmptyListComponent } from '../project-areas-empty-list/project-areas-empty-list.component';
// import { ActivatedRoute } from '@angular/router';
import { AuthService, ScenarioService } from '@app/services';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { BreadcrumbService } from '@app/services/breadcrumb.service';
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

@UntilDestroy()
@Component({
  selector: 'app-project-area-scenarios-list',
  standalone: true,
  imports: [NgFor, ProjectAreasEmptyListComponent, ScenarioCardComponent],
  templateUrl: './project-area-scenarios-list.component.html',
  styleUrl: './project-area-scenarios-list.component.scss',
})
export class ProjectAreaScenariosListComponent {
  @Input({ required: true }) plan!: Plan;
  @Input({ required: true }) projectAreaId!: number;

  user$ = this.authService.loggedInUser$;

  totalScenarios = 0;
  activeScenarios: Scenario[] = [];
  loading: boolean = false;
  sortSelection = '-created_at';

  private manualFetch$ = new Subject<void>();

  constructor(
    // private route: ActivatedRoute,
    private authService: AuthService,
    // private router: Router,
    // private snackbar: MatSnackBar,
    private scenarioService: ScenarioService,
    private dialog: MatDialog
    // private breadcrumbService: BreadcrumbService,
  ) {}

  listsDiffer(listA: Scenario[], listB: Scenario[]) {
    return JSON.stringify(listA) !== JSON.stringify(listB);
  }

  ngOnInit(): void {
    // this.planId = this.route.snapshot.params['planId'];
    this.pollForChanges();
    // this.planState.currentPlan$.pipe(untilDestroyed(this)).subscribe((plan) => {
    //   this.plan = plan;
    // });
  }

  private pollForChanges() {
    console.log('here we are going to poll....');
    const poll$ = timer(0, POLLING_INTERVAL * 10).pipe(
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

  private fetchScenarios$() {
    console.log('and now we fetch...');
    return this.scenarioService
      .getProjectAreaChildScenarios(this.projectAreaId)
      .pipe(
        take(1),
        tap((scenarios) => {
          this.totalScenarios = scenarios.length;
          console.log('here we have the scenarios:', scenarios);
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

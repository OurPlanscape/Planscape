import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  combineLatest,
  concatMap,
  filter,
  map,
  Observable,
  startWith,
  switchMap,
  take,
} from 'rxjs';
import { Plan, User } from '@types';
import {
  AuthService,
  LegacyPlanStateService,
  Note,
  PlanningAreaNotesService,
} from '@services';
import { NotesSidebarState } from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { ScenarioState } from '../maplibre-map/scenario.state';
import { getPlanPath } from './plan-helpers';
import { PlanState } from './plan.state';
import { canAddScenario } from './permissions';

@UntilDestroy()
@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
  providers: [PlanningAreaNotesService],
})
export class PlanComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private LegacyPlanStateService: LegacyPlanStateService,
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private planState: PlanState
  ) {
    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    const plan$ = this.LegacyPlanStateService.getPlan(this.planId).pipe(
      take(1)
    );

    plan$.subscribe({
      error: (error) => {
        this.planNotFound = true;
      },
    });

    this.planOwner$ = plan$.pipe(
      concatMap((plan) => {
        return this.authService.getUser(plan.user);
      })
    );

    combineLatest([
      this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
      this.scenarioState.currentScenario$.pipe(startWith(null)),
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd)
      ),
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([plan, scenario]) => {
        const routeChild = this.route.snapshot.firstChild;
        const path = routeChild?.url[0].path;
        const id = routeChild?.paramMap.get('id') ?? null;

        if (!path) {
          // on plan
          this.breadcrumbService.updateBreadCrumb({
            label: 'Planning Area: ' + plan.name,
            backUrl: '/home',
          });
        } else if (id) {
          // on a specific scenario. Need to have scenario name to populate breadcrumbs.
          if (scenario && scenario.id.toString() === id) {
            this.breadcrumbService.updateBreadCrumb({
              label: 'Scenario: ' + scenario.name,
              backUrl: getPlanPath(plan.id),
            });
          }
        } else {
          // creating new scenario
          this.breadcrumbService.updateBreadCrumb({
            label: 'Scenario: New Scenario',
            backUrl: getPlanPath(plan.id),
          });
        }

        // this is required still to maintain LegacyPlanStateService usage on create-scenarios.
        // We can remove this after refactor.
        if (path === 'config') {
          this.LegacyPlanStateService.updateStateWithScenario(
            id,
            scenario?.name || ''
          );
          this.LegacyPlanStateService.updateStateWithShapes(null);
        } else {
          this.LegacyPlanStateService.updateStateWithScenario(null, null);
          this.LegacyPlanStateService.updateStateWithShapes(null);
        }
        this.LegacyPlanStateService.updateStateWithPlan(plan.id);
      });
  }

  currentPlan$ = this.planState.currentPlan$;
  planOwner$ = new Observable<User | null>();

  planId = this.route.snapshot.paramMap.get('id');
  planNotFound: boolean = !this.planId;

  sidebarNotes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  showOverview$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null), // trigger on initial load
    map(() => this.getDeepestChild(this.route)),
    switchMap((route) => route.data),
    map((data) => data['showOverview'] === true)
  );

  area$ = this.showOverview$.pipe(
    map((show) => (show ? 'SCENARIOS' : 'SCENARIO'))
  );

  ngOnInit() {
    this.loadNotes();
  }

  backToOverview() {
    this.router.navigate(['plan', this.planId]);
  }

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    if (this.planId) {
      this.notesService.addNote(this.planId, comment).subscribe({
        next: () => {
          this.loadNotes();
        },
        error: () => {
          this.snackbar.open(
            `Error: could not add note.`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
        complete: () => {
          this.notesSidebarState = 'READY';
        },
      });
    }
  }

  handleNoteDelete(n: Note) {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (confirmed && this.planId) {
          this.notesService.deleteNote(this.planId, n.id).subscribe({
            next: () => {
              this.snackbar.open(
                `Deleted note`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
              this.loadNotes();
            },
            error: () => {
              this.snackbar.open(
                `Error: Could not delete note.`,
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
          });
        }
      });
  }

  loadNotes() {
    if (this.planId) {
      this.notesService.getNotes(this.planId).subscribe((notes: Note[]) => {
        this.sidebarNotes = notes;
      });
    }
  }

  canAddScenario(plan: Plan) {
    return canAddScenario(plan) || false;
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}

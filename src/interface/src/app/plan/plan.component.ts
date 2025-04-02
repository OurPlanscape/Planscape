import { Component, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import {
  BehaviorSubject,
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
import { getPlanPath } from './plan-helpers';
import { NotesSidebarState } from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
    private LegacyPlanStateService: LegacyPlanStateService,
    private route: ActivatedRoute,
    private router: Router,
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private breadcrumbService: BreadcrumbService
  ) {
    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    const plan$ = this.LegacyPlanStateService.getPlan(this.planId).pipe(
      take(1)
    );

    plan$.subscribe({
      next: (plan) => {
        this.currentPlan$.next(plan);
      },
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
      this.scenarioName$,
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([plan, scenarioName]) => {
        const path = this.getPathFromSnapshot();
        const scenarioId = this.route.children[0]?.snapshot.params['id'];

        const navStateObject = {
          currentView: '',
          currentRecordName: '',
          backLink: '/home',
        };
        if (path === 'config' && !scenarioId && !scenarioName) {
          navStateObject.currentView = 'Scenario';
          navStateObject.currentRecordName = 'New Scenario';
          navStateObject.backLink = getPlanPath(plan.id);
        } else if (scenarioName) {
          navStateObject.currentView = 'Scenario';
          navStateObject.currentRecordName = scenarioName;
          navStateObject.backLink = getPlanPath(plan.id);
        } else if (path !== 'config' && plan.name && !scenarioName) {
          navStateObject.currentView = 'Planning Area';
          navStateObject.currentRecordName = plan.name;
        }

        if (navStateObject.currentView) {
          this.breadcrumbService.updateBreadCrumb({
            label:
              navStateObject.currentView +
              ': ' +
              navStateObject.currentRecordName,
            backUrl: navStateObject.backLink!,
          });
        }

        return navStateObject;
      });
  }

  currentPlan$ = new BehaviorSubject<Plan | null>(null);
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

  scenarioName$ = this.LegacyPlanStateService.planState$.pipe(
    map((state) => {
      return state.currentScenarioName;
    })
  );

  ngOnInit() {
    this.updatePlanStateFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEvent) => {
        this.updatePlanStateFromRoute();
      });
    this.loadNotes();
  }

  private getPathFromSnapshot() {
    const routeChild = this.route.snapshot.firstChild;
    return routeChild?.url[0].path;
  }

  private updatePlanStateFromRoute() {
    if (this.planId) {
      this.LegacyPlanStateService.updateStateWithPlan(
        parseInt(this.planId, 10)
      );
    }

    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const id = routeChild?.paramMap.get('id') ?? null;

    if (path === 'config') {
      const name =
        this.LegacyPlanStateService.planState$.value.currentScenarioName;
      this.LegacyPlanStateService.updateStateWithScenario(id, name);
      this.LegacyPlanStateService.updateStateWithShapes(null);
    } else {
      this.LegacyPlanStateService.updateStateWithScenario(null, null);
      this.LegacyPlanStateService.updateStateWithShapes(null);
    }
  }

  backToOverview() {
    this.router.navigate(['plan', this.currentPlan$.value!.id]);
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

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}

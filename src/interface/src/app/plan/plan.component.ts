import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  Event as NavigationEvent,
  NavigationEnd,
  Router,
} from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { PlanningAreaNotesService } from '@services';
import { Plan, User } from '@types';
import { AuthService, PlanStateService, ScenarioService } from '@services';
import { Breadcrumb } from '@shared';
import { getPlanPath } from './plan-helpers';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { NotesSidebarState } from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { Note } from '@services';
import { DeleteNoteDialogComponent } from '../plan/delete-note-dialog/delete-note-dialog.component';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
  providers: [PlanningAreaNotesService],
})
export class PlanComponent implements OnInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private planStateService: PlanStateService,
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private homeParametersStorageService: HomeParametersStorageService,
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
    // TODO: Move everything in the constructor to ngOnInit

    if (this.planId === null) {
      this.planNotFound = true;
      return;
    }
    const plan$ = this.planStateService.getPlan(this.planId).pipe(take(1));

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
  }

  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  planOwner$ = new Observable<User | null>();
  private readonly destroy$ = new Subject<void>();

  planId = this.route.snapshot.paramMap.get('id');
  planNotFound: boolean = !this.planId;

  sidebarNotes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  showOverview$ = new BehaviorSubject<boolean>(false);
  area$ = this.showOverview$.pipe(
    map((show) => (show ? 'SCENARIOS' : 'SCENARIO'))
  );

  scenario$ = this.planStateService.planState$.pipe(
    switchMap((state) => {
      if (state.currentScenarioId) {
        return this.scenarioService.getScenario(state.currentScenarioId);
      }
      return of(null);
    }),
    catchError((e) => {
      return of(undefined);
    })
  );
  breadcrumbs$ = combineLatest([
    this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
    this.scenario$,
  ]).pipe(
    map(([plan, scenario]) => {
      const path = this.getPathFromSnapshot();
      const scenarioId = this.route.children[0]?.snapshot.params['id'];

      const crumbs: Breadcrumb[] = [
        {
          name: plan.name,
          path: path === 'config' ? getPlanPath(plan.id) : undefined,
        },
      ];
      if (scenario === undefined) {
        return crumbs;
      }
      if (path === 'config' && !scenarioId) {
        crumbs.push({ name: 'New Scenario' });
      }
      if (scenario) {
        crumbs.push({ name: scenario.name || '' });
      }
      return crumbs;
    })
  );

  ngOnInit() {
    this.planStateService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const path = this.getPathFromSnapshot();
        if (state.currentScenarioId || path === 'config') {
          this.showOverview$.next(false);
        } else {
          this.showOverview$.next(true);
        }
      });
    this.updatePlanStateFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEvent) => {
        this.updatePlanStateFromRoute();
      });

    // TODO: add featureflag
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getPathFromSnapshot() {
    const routeChild = this.route.snapshot.firstChild;
    return routeChild?.url[0].path;
  }

  private updatePlanStateFromRoute() {
    if (this.planId) {
      this.planStateService.updateStateWithPlan(parseInt(this.planId, 10));
    }

    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const id = routeChild?.paramMap.get('id') ?? null;

    if (path === 'config') {
      this.planStateService.updateStateWithScenario(id);
      this.planStateService.updateStateWithShapes(null);
    } else {
      this.planStateService.updateStateWithScenario(null);
      this.planStateService.updateStateWithShapes(null);
    }
  }

  backToOverview() {
    this.router.navigate(['plan', this.currentPlan$.value!.id]);
  }

  goBack() {
    if (this.showOverview$.value) {
      this.router.navigate(['home'], {
        queryParams: this.homeParametersStorageService.getItem(),
      });
    } else {
      this.backToOverview();
    }
  }

  //notes handling functions
  addNote(comment: string) {
    this.notesSidebarState = 'SAVING';
    if (this.planId) {
      this.notesService.addNote(this.planId, comment).subscribe((note) => {
        this.sidebarNotes.unshift(note);
        this.loadNotes();
      });
    }
    this.notesSidebarState = 'READY';
  }

  handleNoteDelete(n: Note) {
    const noteId = n.id.toString();
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {});
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (confirmed && this.planId) {
          this.notesService.deleteNote(this.planId, noteId).subscribe({
            next: () => {
              this.snackbar.open(
                `Deleted note`,
                'Dismiss',
                SNACK_NOTICE_CONFIG
              );
              this.loadNotes();
            },
            error: (err) => {
              this.snackbar.open(
                `Error: ${err.statusText}`,
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
      this.notesService.getNotes(this.planId).subscribe((notes) => {
        this.sidebarNotes = notes;
      });
    }
  }
}

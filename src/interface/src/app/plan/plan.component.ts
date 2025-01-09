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
  Subject,
  take,
  takeUntil,
} from 'rxjs';
import { Plan, User } from '@types';
import {
  AuthService,
  PlanStateService,
  Note,
  PlanningAreaNotesService,
} from '@services';
import { getPlanPath } from './plan-helpers';
import { HomeParametersStorageService } from '@services/local-storage.service';
import { NotesSidebarState } from 'src/styleguide/notes-sidebar/notes-sidebar.component';
import { DeleteNoteDialogComponent } from '../plan/delete-note-dialog/delete-note-dialog.component';
import { NavState, SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
  providers: [PlanningAreaNotesService],
})
export class PlanComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private planStateService: PlanStateService,
    private route: ActivatedRoute,
    private router: Router,
    private homeParametersStorageService: HomeParametersStorageService,
    private notesService: PlanningAreaNotesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
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

  planId = this.route.snapshot.paramMap.get('id');
  planNotFound: boolean = !this.planId;

  sidebarNotes: Note[] = [];
  notesSidebarState: NotesSidebarState = 'READY';

  showOverview$ = new BehaviorSubject<boolean>(false);
  area$ = this.showOverview$.pipe(
    map((show) => (show ? 'SCENARIOS' : 'SCENARIO'))
  );
  private readonly destroy$ = new Subject<void>();

  scenarioName$ = this.planStateService.planState$.pipe(
    map((state) => {
      return state.currentScenarioName;
    })
  );

  navState$: Observable<NavState> = combineLatest([
    this.currentPlan$.pipe(filter((plan): plan is Plan => !!plan)),
    this.scenarioName$,
  ]).pipe(
    map(([plan, scenarioName]) => {
      const path = this.getPathFromSnapshot();
      const scenarioId = this.route.children[0]?.snapshot.params['id'];

      const navStateObject: NavState = {
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

      return navStateObject;
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
    this.loadNotes();
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
      const name = this.planStateService.planState$.value.currentScenarioName;
      this.planStateService.updateStateWithScenario(id, name);
      this.planStateService.updateStateWithShapes(null);
    } else {
      this.planStateService.updateStateWithScenario(null, null);
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
}

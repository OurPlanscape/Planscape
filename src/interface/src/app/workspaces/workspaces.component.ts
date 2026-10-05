import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  EMPTY,
  exhaustMap,
  filter,
  interval,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  ButtonComponent,
  EmptyStateComponent,
  NoResultsComponent,
  PaginatorComponent,
  SearchBarComponent,
  WorkspaceCardComponent,
} from '@styleguide';
import { SNACK_ERROR_CONFIG } from '@shared';
import { POLLING_INTERVAL } from '@plan/plan-helpers';
import { WorkspacesService } from '@services';
import { LoadedResult, Pagination, Resource, Workspace } from '@types';
import {
  CreateWorkspaceOrigin,
  WorkspaceActionsService,
} from './workspace-actions.service';

interface WorkspacesQuery {
  search: string;
  page: number;
}

type WorkspacesView = 'loading' | 'error' | 'empty' | 'no-results' | 'list';

/** Divides evenly by every column count the grid uses. */
const PAGE_SIZE = 12;

@UntilDestroy()
@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    EmptyStateComponent,
    MatProgressSpinnerModule,
    NgFor,
    NgIf,
    NoResultsComponent,
    PaginatorComponent,
    SearchBarComponent,
    WorkspaceCardComponent,
  ],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.scss',
})
export class WorkspacesComponent implements OnInit {
  private workspaceActionsService = inject(WorkspaceActionsService);
  private workspacesService = inject(WorkspacesService);
  private snackbar = inject(MatSnackBar);

  private reload$ = new BehaviorSubject<void>(undefined);

  /** The search bar debounces, so this only emits terms worth a request. */
  private query$ = new BehaviorSubject<WorkspacesQuery>({
    search: '',
    page: 1,
  });

  /** Whether the account has any workspaces at all, ignoring the current search. */
  private hasWorkspaces = false;

  /** Kept between requests so the paginator stays put while a page loads. */
  private _pageCount$ = new BehaviorSubject(0);

  /**
   * The cards on screen. Edits land here first so the grid keeps working while
   * the list reloads behind it.
   */
  private currentWorkspaces$ = new BehaviorSubject<Workspace[]>([]);

  private workspacesResource$: Observable<Resource<Pagination<Workspace>>> =
    combineLatest([this.reload$, this.query$]).pipe(
      switchMap(([_, query]) =>
        concat(
          of({ isLoading: true } as Resource<Pagination<Workspace>>),
          this.listWorkspaces(query).pipe(
            tap((page) => this.applyPage(page, query)),
            map(
              (page) =>
                ({
                  data: page,
                  isLoading: false,
                }) as LoadedResult<Pagination<Workspace>>
            ),
            catchError((error) => {
              // Losing a grid that still works over a failed refresh is
              // worse than the stale count it leaves behind.
              if (this.currentWorkspaces$.value.length) {
                this.snackbar.open(
                  'Unable to refresh your workspaces',
                  'Dismiss',
                  SNACK_ERROR_CONFIG
                );
                return of({
                  isLoading: false,
                } as Resource<Pagination<Workspace>>);
              }
              return of({ isLoading: false, error });
            })
          )
        )
      ),
      shareReplay(1)
    );

  /** What the panel shows. Only one of these is ever on screen. */
  view$: Observable<WorkspacesView> = combineLatest([
    this.workspacesResource$,
    this.currentWorkspaces$,
  ]).pipe(
    map(([resource, workspaces]) => {
      if (resource.error) {
        return 'error';
      }
      // Reloading behind cards we already have is not worth a spinner.
      if (resource.isLoading && !workspaces.length) {
        return 'loading';
      }
      if (workspaces.length) {
        return 'list';
      }
      return this.query$.value.search ? 'no-results' : 'empty';
    })
  );

  /** The search and create controls are pointless before the first workspace. */
  showHeaderActions$ = this.view$.pipe(map(() => this.hasWorkspaces));

  workspaces$ = this.currentWorkspaces$.asObservable();
  pageCount$ = this._pageCount$.asObservable();

  searchTerm$ = this.query$.pipe(map((query) => query.search));
  page$ = this.query$.pipe(map((query) => query.page));

  ngOnInit() {
    this.pollForChanges();
  }

  /** Picks up workspaces created by collaborators without touching the loading state. */
  private pollForChanges() {
    interval(POLLING_INTERVAL)
      .pipe(
        exhaustMap(() =>
          this.listWorkspaces(this.query$.value).pipe(
            takeUntil(
              this.workspacesResource$.pipe(filter((r) => !!r.isLoading))
            ),
            catchError(() => EMPTY)
          )
        ),
        untilDestroyed(this)
      )
      .subscribe((page) => this.applyPage(page, this.query$.value));
  }

  private listWorkspaces(query: WorkspacesQuery) {
    return this.workspacesService.listWorkspaces({
      search: query.search,
      limit: PAGE_SIZE,
      offset: (query.page - 1) * PAGE_SIZE,
    });
  }

  private applyPage(page: Pagination<Workspace>, query: WorkspacesQuery) {
    this._pageCount$.next(Math.ceil(page.count / PAGE_SIZE));
    this.currentWorkspaces$.next(page.results);
    if (!query.search) {
      this.hasWorkspaces = page.results.length > 0;
    }
  }

  search(searchTerm: string) {
    this.setQuery({ search: searchTerm, page: 1 });
  }

  goToPage(page: number) {
    this.setQuery({ ...this.query$.value, page });
  }

  /** Cards from the old query are worse than a spinner, so drop them first. */
  private setQuery(query: WorkspacesQuery) {
    this.currentWorkspaces$.next([]);
    this.query$.next(query);
  }

  createWorkspace(origin: CreateWorkspaceOrigin) {
    this.workspaceActionsService
      .openCreateWorkspaceModal(origin)
      .subscribe((workspace) => {
        if (workspace) {
          this.reload$.next();
        }
      });
  }

  /** The list is ordered by creation date, so a rename never moves the card. */
  renameWorkspace(workspace: Workspace) {
    this.workspaceActionsService
      .renameWorkspace(workspace)
      .subscribe((renamed) => {
        if (renamed) {
          this.currentWorkspaces$.next(
            this.currentWorkspaces$.value.map((w) =>
              w.id === renamed.id ? renamed : w
            )
          );
        }
      });
  }

  shareWorkspace(workspace: Workspace) {
    this.workspaceActionsService.shareWorkspace(workspace);
  }

  deleteWorkspace(workspace: Workspace) {
    this.workspaceActionsService
      .deleteWorkspace(workspace)
      .subscribe((deleted) => {
        if (deleted) {
          this.currentWorkspaces$.next(
            this.currentWorkspaces$.value.filter((w) => w.id !== workspace.id)
          );
          this.reloadAfterDelete();
        }
      });
  }

  /**
   * The card is already gone from the list; this refills the page behind it,
   * or steps back when it was the only one left on this page.
   */
  private reloadAfterDelete() {
    const { page } = this.query$.value;
    if (page > 1 && !this.currentWorkspaces$.value.length) {
      this.goToPage(page - 1);
    } else {
      this.reload$.next();
    }
  }

  can(workspace: Workspace, permission: string): boolean {
    return workspace.permissions.includes(permission);
  }

  trackById(_index: number, workspace: Workspace) {
    return workspace.id;
  }

  retry() {
    this.reload$.next();
  }
}

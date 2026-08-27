import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  NoResultsComponent,
  PaginatorComponent,
  SearchBarComponent,
  WorkspaceCardComponent,
} from '@styleguide';
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
export class WorkspacesComponent {
  private workspaceActionsService = inject(WorkspaceActionsService);
  private workspacesService = inject(WorkspacesService);
  private router = inject(Router);

  private reload$ = new BehaviorSubject<void>(undefined);

  /** The search bar debounces, so this only emits terms worth a request. */
  private query$ = new BehaviorSubject<WorkspacesQuery>({
    search: '',
    page: 1,
  });

  /** Whether the account has any workspaces at all, ignoring the current search. */
  private hasWorkspaces = false;

  /** Kept between requests so the paginator stays put while a page loads. */
  private pageCount = 0;

  /** How many cards the current page holds, so deleting the last one can step back. */
  private resultsOnPage = 0;

  private workspacesResource$: Observable<Resource<Pagination<Workspace>>> =
    combineLatest([this.reload$, this.query$]).pipe(
      switchMap(([_, query]) =>
        concat(
          of({ isLoading: true } as Resource<Pagination<Workspace>>),
          this.workspacesService
            .listWorkspaces({
              search: query.search,
              limit: PAGE_SIZE,
              offset: (query.page - 1) * PAGE_SIZE,
            })
            .pipe(
              // Only an unfiltered response tells us whether the account has
              // any workspaces; a search finding nothing does not.
              tap((page) => {
                this.pageCount = Math.ceil(page.count / PAGE_SIZE);
                this.resultsOnPage = page.results.length;
                if (!query.search) {
                  this.hasWorkspaces = page.results.length > 0;
                }
              }),
              map(
                (page) =>
                  ({
                    data: page,
                    isLoading: false,
                  }) as LoadedResult<Pagination<Workspace>>
              ),
              catchError((error) => of({ isLoading: false, error }))
            )
        )
      ),
      shareReplay(1)
    );

  /** What the panel shows. Loading wins, so nothing else can flash first. */
  view$: Observable<WorkspacesView> = this.workspacesResource$.pipe(
    map((resource) => {
      if (resource.isLoading) {
        return 'loading';
      }
      if (resource.error) {
        return 'error';
      }
      if (resource.data?.results.length) {
        return 'list';
      }
      return this.query$.value.search ? 'no-results' : 'empty';
    })
  );

  /** The search and create controls are pointless before the first workspace. */
  showHeaderActions$ = this.view$.pipe(map(() => this.hasWorkspaces));

  workspaces$ = this.workspacesResource$.pipe(map((r) => r.data?.results));
  pageCount$ = this.workspacesResource$.pipe(map(() => this.pageCount));

  searchTerm$ = this.query$.pipe(map((query) => query.search));
  page$ = this.query$.pipe(map((query) => query.page));

  search(searchTerm: string) {
    this.query$.next({ search: searchTerm, page: 1 });
  }

  goToPage(page: number) {
    this.query$.next({ ...this.query$.value, page });
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

  renameWorkspace(workspace: Workspace) {
    this.workspaceActionsService
      .renameWorkspace(workspace)
      .subscribe((renamed) => {
        if (renamed) {
          this.reload$.next();
        }
      });
  }

  deleteWorkspace(workspace: Workspace) {
    this.workspaceActionsService
      .deleteWorkspace(workspace)
      .subscribe((deleted) => {
        if (deleted) {
          this.reloadAfterDelete();
        }
      });
  }

  /** Deleting the only card on a page would otherwise strand us on an empty one. */
  private reloadAfterDelete() {
    const { page } = this.query$.value;
    if (page > 1 && this.resultsOnPage === 1) {
      this.goToPage(page - 1);
    } else {
      this.reload$.next();
    }
  }

  goToWorkspace(workspace: Workspace) {
    this.router.navigate(['/workspace', workspace.id]);
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

import { inject, Injectable } from '@angular/core';
import { LoadedResult, Workspace, Resource } from '@types';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { WorkspacesService } from '@services';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceState {
  private workspaceService = inject(WorkspacesService);

  // The ID of the current workspace
  private _currentWorkspaceId$ = new BehaviorSubject<number | null>(null);
  public currentWorkspaceId$ = this._currentWorkspaceId$.asObservable();

  // BehaviorSubject that we are going to use to manually reload the workspace
  private _reloadWorkspace$ = new BehaviorSubject<void>(undefined);

  // Listen to ID changes and trigger network calls, returning typed results.
  private currentWorkspaceResource$: Observable<Resource<Workspace>> =
    combineLatest([
      this._currentWorkspaceId$.pipe(distinctUntilChanged()),
      this._reloadWorkspace$,
    ]).pipe(
      switchMap(([id]) => {
        // clear resource when id is not provided
        if (id == null) {
          return of({ isLoading: false } as Resource<Workspace>);
        }

        return concat(
          // when loading emit object with loading
          of({ isLoading: true }),
          this.workspaceService.getWorkspace(id).pipe(
            map(
              (data) => ({ data, isLoading: false }) as LoadedResult<Workspace>
            ),
            // when we have errors, emit object with loading false and error
            catchError((error) => of({ isLoading: false, error: error }))
          )
        );
      }),
      shareReplay(1)
    );

  /**
   * This observable filter currentWorkspaceResource$ to only emit when we have a workspace,
   * and we are not loading.
   * Throws error if `currentWorkspaceResource$` has errors
   */
  public currentWorkspace$ = this.currentWorkspaceResource$.pipe(
    filter((d) => !d.isLoading),
    filter((d) => {
      if (d.error) throw d.error; // throw real errors
      return !!d.data; // only emit when we actually have a workspace
    }),
    map((d) => d.data as Workspace)
  );

  /**
   * Observable that maps only to loading status.
   */
  public isWorkspaceLoading$ = this.currentWorkspaceResource$.pipe(
    map((d) => d.isLoading)
  );

  public workspaceNotFound$ = this.currentWorkspaceResource$.pipe(
    map((resource) => {
      const error = resource.error;

      return error instanceof HttpErrorResponse && error.status === 404;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  setWorkspaceId(id: number) {
    this._currentWorkspaceId$.next(id);
  }

  resetWorkspaceId() {
    this._currentWorkspaceId$.next(null);
  }

  reloadWorkspace() {
    this._reloadWorkspace$.next();
  }
}

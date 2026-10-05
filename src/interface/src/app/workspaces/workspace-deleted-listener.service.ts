import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  ignoreElements,
  interval,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { AuthService, WorkspacesService } from '@services';
import { Workspace, WorkspaceDeletedPayload } from '@types';
import { POLLING_INTERVAL } from '@plan/plan-helpers';
import { WorkspaceState } from './workspace.state';
import { WorkspaceDeletedModalComponent } from './workspace-deleted-modal/workspace-deleted-modal.component';

/**
 * Tells the members of a workspace when its creator deletes it while they are
 * inside it, and sends them back home.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceDeletedListenerService {
  private workspacesService = inject(WorkspacesService);
  private workspaceState = inject(WorkspaceState);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  start(): void {
    this.workspaceDeleted$()
      .pipe(
        filter((event) => event.workspace_id === this.currentWorkspaceId()),
        switchMap(() =>
          this.workspaceState.currentWorkspace$.pipe(
            take(1),
            catchError(() => EMPTY)
          )
        ),
        // the creator already knows: they did it
        filter(
          (workspace) =>
            workspace.created_by !== this.authService.currentUser()?.id
        ),
        // one modal at a time
        exhaustMap((workspace) => this.showDeletedModal(workspace))
      )
      .subscribe();
  }

  /**
   * Emits when the workspace we are in no longer exists.
   *
   * Polls the workspace while we are inside one; a 404 means it was deleted.
   * TODO: replace the polling with
   * `this.webSocketService.on<WorkspaceDeletedPayload>(WORKSPACE_DELETED_EVENT)`
   * once the backend emits it.
   */
  private workspaceDeleted$(): Observable<WorkspaceDeletedPayload> {
    return interval(POLLING_INTERVAL).pipe(
      map(() => this.currentWorkspaceId()),
      filter((workspaceId): workspaceId is number => workspaceId !== null),
      // ignore ticks while a check is in flight
      exhaustMap((workspaceId) =>
        this.workspacesService.getWorkspace(workspaceId).pipe(
          ignoreElements(),
          catchError((error) =>
            error instanceof HttpErrorResponse && error.status === 404
              ? of({ workspace_id: workspaceId })
              : EMPTY
          )
        )
      )
    );
  }

  //The workspaceId param of the active route if we are inside a workspace
  private currentWorkspaceId(): number | null {
    let route: ActivatedRouteSnapshot | null =
      this.router.routerState.snapshot.root;
    while (route) {
      const workspaceId = route.paramMap.get('workspaceId');
      if (workspaceId) {
        return Number(workspaceId);
      }
      route = route.firstChild;
    }
    return null;
  }

  private showDeletedModal(workspace: Workspace): Observable<unknown> {
    return this.dialog
      .open(WorkspaceDeletedModalComponent, {
        data: { workspaceName: workspace.name },
        disableClose: true,
      })
      .afterClosed()
      .pipe(tap(() => this.router.navigate(['/home'])));
  }
}

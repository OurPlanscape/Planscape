import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  map,
  Observable,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import {
  Workspace,
  WorkspaceDeletedPayload,
  WORKSPACE_DELETED_EVENT,
} from '@types';
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
  private webSocketService = inject(WebSocketService);
  private workspaceState = inject(WorkspaceState);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  start(): void {
    this.workspaceDeleted$()
      .pipe(
        filter(
          (event) =>
            event.workspace_id === this.workspaceState.currentWorkspaceIdValue
        ),
        switchMap(() =>
          this.workspaceState.currentWorkspace$.pipe(
            take(1),
            catchError(() => EMPTY)
          )
        ),
        // one modal at a time
        exhaustMap((workspace) => this.showDeletedModal(workspace))
      )
      .subscribe();
  }

  /**
   * Emits when the workspace we are in no longer exists.
   *
   */
  private workspaceDeleted$(): Observable<WorkspaceDeletedPayload> {
    return this.webSocketService
      .on<WorkspaceDeletedPayload>(WORKSPACE_DELETED_EVENT)
      .pipe(
        filter(
          (event) => event.actor_id !== this.authService.currentUser()?.id
        ),
        map((event) => ({
          workspace_id: event.data?.workspace_id ?? event.workspace_id ?? 0,
        }))
      );
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

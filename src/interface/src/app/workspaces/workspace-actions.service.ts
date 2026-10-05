import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, take, tap } from 'rxjs';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { WorkspacesService } from '@services';
import { Workspace } from '@types';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';
import { CreateWorkspaceModalComponent } from './create-workspace-modal/create-workspace-modal.component';
import { WelcomeWorkspaceModalComponent } from './welcome-workspace-modal/welcome-workspace-modal.component';
import { ShareDialogComponent } from '@app/sharing/share-dialog/share-dialog.component';

export type CreateWorkspaceOrigin = 'empty-state' | 'list';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceActionsService {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private workspacesService = inject(WorkspacesService);

  /**
   * Opens the "New Workspace" modal, then redirects and welcomes the user, or
   * shows a toast, depending on `origin`.
   * Emits the created workspace, or `null` if cancelled.
   */
  openCreateWorkspaceModal(
    origin: CreateWorkspaceOrigin
  ): Observable<Workspace | null> {
    return this.dialog
      .open(CreateWorkspaceModalComponent, { restoreFocus: false })
      .afterClosed()
      .pipe(
        map((workspace: Workspace | undefined) => workspace ?? null),
        tap((workspace) => {
          if (workspace) {
            this.handleCreatedWorkspace(workspace, origin);
          }
        })
      );
  }

  /**
   * Opens the same modal prefilled with the current name.
   * Emits the renamed workspace, or `null` if cancelled.
   */
  renameWorkspace(workspace: Workspace): Observable<Workspace | null> {
    return this.dialog
      .open(CreateWorkspaceModalComponent, {
        restoreFocus: false,
        data: { workspace },
      })
      .afterClosed()
      .pipe(
        map((renamed: Workspace | undefined) => renamed ?? null),
        tap((renamed) => {
          if (renamed) {
            this.snackbar.open(
              `Workspace name has been updated`,
              'Dismiss',
              SNACK_NOTICE_CONFIG
            );
          }
        })
      );
  }

  /** Opens the share modal on the workspace's access list. */
  shareWorkspace(workspace: Workspace) {
    this.dialog.open(ShareDialogComponent, {
      data: { kind: 'workspace', workspace },
      restoreFocus: false,
      panelClass: 'no-padding-dialog',
    });
  }

  /**
   * Asks for confirmation before deleting.
   * Emits `true` only once the workspace is actually gone.
   */
  deleteWorkspace(workspace: Workspace): Observable<boolean> {
    return this.dialog
      .open(DeleteDialogComponent, {
        data: {
          title: `Delete workspace "${workspace.name}"?`,
          body: `This workspace, along with all associated planning areas, scenarios,
                 and data, will be permanently deleted. Collaborators will lose
                 access. This action cannot be undone.`,
        },
      })
      .afterClosed()
      .pipe(
        take(1),
        switchMap((confirmed) =>
          confirmed ? this.runDelete(workspace) : of(false)
        )
      );
  }

  private runDelete(workspace: Workspace): Observable<boolean> {
    return this.workspacesService.deleteWorkspace(workspace.id).pipe(
      map(() => true),
      tap(() =>
        this.snackbar.open(
          `Successfully deleted workspace: ${workspace.name}`,
          'Dismiss',
          SNACK_NOTICE_CONFIG
        )
      ),
      catchError(() => {
        this.snackbar.open(
          `Unable to delete workspace: ${workspace.name}`,
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
        return of(false);
      })
    );
  }

  private handleCreatedWorkspace(
    workspace: Workspace,
    origin: CreateWorkspaceOrigin
  ) {
    if (origin === 'empty-state') {
      this.router
        .navigate(['/workspace', workspace.id])
        .then((navigated) => navigated && this.showWelcomeModal());
    } else {
      this.snackbar.open(
        `Workspace "${workspace.name}" has been created`,
        'Dismiss',
        SNACK_NOTICE_CONFIG
      );
    }
  }

  private showWelcomeModal() {
    // 600px is what the illustration was cut for
    this.dialog.open(WelcomeWorkspaceModalComponent, {
      restoreFocus: false,
      width: '600px',
      panelClass: 'rounded-dialog',
    });
  }
}

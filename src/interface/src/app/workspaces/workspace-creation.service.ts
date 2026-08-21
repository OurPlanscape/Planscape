import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { SNACK_NOTICE_CONFIG } from '@shared';
import { Workspace } from '@types';
import { CreateWorkspaceModalComponent } from './create-workspace-modal/create-workspace-modal.component';
import { WelcomeWorkspaceModalComponent } from './welcome-workspace-modal/welcome-workspace-modal.component';

export type CreateWorkspaceOrigin = 'empty-state' | 'list';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceCreationService {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);

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

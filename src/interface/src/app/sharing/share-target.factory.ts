import { inject, Injectable } from '@angular/core';
import { AuthService, InvitesService, WorkspacesService } from '@services';
import { PlanShareTarget } from './plan-share-target';
import { ShareDialogData, ShareTarget } from './share-target';
import { WorkspaceShareTarget } from './workspace-share-target';

/** Resolves what the share modal was opened for into a `ShareTarget`. */
@Injectable({
  providedIn: 'root',
})
export class ShareTargetFactory {
  private authService = inject(AuthService);
  private invitesService = inject(InvitesService);
  private workspacesService = inject(WorkspacesService);

  create(data: ShareDialogData): ShareTarget {
    switch (data.kind) {
      case 'plan':
        return new PlanShareTarget(
          data.plan,
          this.invitesService,
          this.authService
        );
      case 'workspace':
        return new WorkspaceShareTarget(
          data.workspace,
          this.workspacesService,
          this.authService
        );
    }
  }
}

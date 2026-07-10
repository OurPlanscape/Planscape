import { Component, Inject } from '@angular/core';

import { Invite, INVITE_ROLE, Plan, User } from '@types';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import { AuthService, InvitesService } from '@services';
import { filter, map, tap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

const Roles: Record<INVITE_ROLE, INVITE_ROLE> = {
  Viewer: 'Viewer',
  Collaborator: 'Collaborator',
  Owner: 'Owner',
};

@Component({
  selector: 'app-share-plan-dialog',
  templateUrl: './share-plan-dialog.component.html',
  styleUrls: ['./share-plan-dialog.component.scss'],
})
export class SharePlanDialogComponent {
  constructor(
    private matSnackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SharePlanDialogComponent>,
    private inviteService: InvitesService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      plan: Plan;
    }
  ) {}

  emails: string[] = [];
  submitting = false;
  message = '';
  isLoading = true;

  invites$ = this.inviteService
    .getInvites(this.data.plan.id)
    .pipe(tap((_) => (this.isLoading = false)));

  fullname$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    map((user) => [user.firstName, user.lastName].join(' '))
  );

  showCreator$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    map((user) => user.id != this.data.plan.user)
  );

  roles: INVITE_ROLE[] = Object.keys(Roles) as INVITE_ROLE[];

  selectedRole = this.roles[0] as INVITE_ROLE;

  close() {
    this.dialogRef.close();
  }

  invite() {
    this.submitting = true;
    this.inviteService
      .inviteUsers(
        this.emails,
        this.selectedRole,
        this.data.plan.id,
        this.message
      )
      .subscribe({
        next: (result) => {
          this.showSnackbar('Users invited');
          this.close();
        },
        error: () => {
          this.showSnackbar(
            'There was an error trying to send the invites. Please try again.'
          );
          this.submitting = false;
        },
      });
  }

  changeRole(invite: Invite, newRole: INVITE_ROLE) {
    this.selectedRole = Roles[newRole];
    this.inviteService.changeRole(invite.id, newRole).subscribe({
      next: () => {
        invite.role = newRole;
        this.showSnackbar('Access Updated');
      },
      error: () => {
        this.showSnackbar(
          `There was an error trying to update the role of ${invite.email}. Please try again.`
        );
      },
    });
  }

  changeInvitationsRole(role: INVITE_ROLE) {
    this.selectedRole = Roles[role];
  }

  resendCode(invite: Invite) {
    this.inviteService
      .inviteUsers([invite.email], this.selectedRole, this.data.plan.id)
      .subscribe({
        next: (result) => {
          this.showSnackbar(`Email sent to ${invite.email}`);
        },
        error: () => {
          this.showSnackbar(
            `There was an error trying to resend code to ${invite.email}. Please try again.`
          );
        },
      });
  }

  reloadInvites() {
    this.invites$ = this.inviteService
      .getInvites(this.data.plan.id)
      .pipe(tap((_) => (this.isLoading = false)));
  }

  removeAccess(invite: Invite) {
    this.inviteService.deleteInvite(invite.id).subscribe({
      next: () => {
        this.showSnackbar(`Removed  ${invite.email}`);
        this.reloadInvites();
      },
      error: () => {
        this.showSnackbar(
          `There was an error trying to revoke access for ${invite.email}. Please try again.`
        );
      },
    });
  }

  private showSnackbar(message: string) {
    this.matSnackBar.open(message, 'Dismiss', SNACK_BOTTOM_NOTICE_CONFIG);
  }
}

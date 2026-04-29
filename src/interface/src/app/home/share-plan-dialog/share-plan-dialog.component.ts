import { Component, Inject } from '@angular/core';

import { FormMessageType, Plan, User } from '@types';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import { AuthService } from '@services';
import { InvitesService } from '@api/invites/invites.service';
import { RoleEnum, UserObjectRole } from '@api/planscapeAPI.schemas';
import { filter, map, tap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

const Roles: Record<RoleEnum, RoleEnum> = {
  Viewer: RoleEnum.Viewer,
  Collaborator: RoleEnum.Collaborator,
  Owner: RoleEnum.Owner,
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
  errorType = FormMessageType.ERROR;
  invalidEmail = false;
  showHelp = false;
  submitting = false;
  message = '';
  isLoading = true;

  invites$ = this.inviteService
    .invitesList('planningarea', this.data.plan.id)
    .pipe(tap((_) => (this.isLoading = false)));

  fullname$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    map((user) => [user.firstName, user.lastName].join(' '))
  );

  showCreator$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    map((user) => user.id != this.data.plan.user)
  );

  roles: RoleEnum[] = Object.keys(Roles) as RoleEnum[];

  selectedRole = this.roles[0] as RoleEnum;

  addEmail(email: string): void {
    this.emails.push(email);
  }

  removeEmail(email: string): void {
    const index = this.emails.indexOf(email);

    if (index >= 0) {
      this.emails.splice(index, 1);
    }
  }

  close() {
    this.dialogRef.close();
  }

  invite() {
    this.submitting = true;
    this.inviteService
      .invitesCreate({
        emails: this.emails,
        role: this.selectedRole,
        object_pk: this.data.plan.id,
        message: this.message || null,
      })
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

  get showMessageBox() {
    return this.invalidEmail || this.emails.length > 0;
  }

  startOver() {
    this.invalidEmail = false;
    this.emails = [];
  }

  changeRole(invite: UserObjectRole, newRole: RoleEnum) {
    this.selectedRole = Roles[newRole];
    this.inviteService.invitesPartialUpdate(invite.id, { role: newRole }).subscribe({
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

  changeInvitationsRole(role: RoleEnum) {
    this.selectedRole = Roles[role];
  }

  resendCode(invite: UserObjectRole) {
    this.inviteService
      .invitesCreate({
        emails: [invite.email],
        role: this.selectedRole,
        object_pk: this.data.plan.id,
      })
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
      .invitesList('planningarea', this.data.plan.id)
      .pipe(tap((_) => (this.isLoading = false)));
  }

  removeAccess(invite: UserObjectRole) {
    this.inviteService.invitesDestroy(invite.id).subscribe({
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

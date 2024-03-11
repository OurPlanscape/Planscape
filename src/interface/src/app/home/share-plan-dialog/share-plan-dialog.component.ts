import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormMessageType, User } from '../../types';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '../../shared/constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, InvitesService, PlanStateService } from '@services';
import { Invite, INVITE_ROLE } from '../../types/invite.types';
import { filter, map, shareReplay, switchMap, tap } from 'rxjs';

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
    private planStateService: PlanStateService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      planningAreaName: string;
      planningAreaId: number;
    }
  ) {}

  emails: string[] = [];
  errorType = FormMessageType.ERROR;
  invalidEmail = false;
  showHelp = false;
  submitting = false;
  message = '';
  isLoading = true;

  plan$ = this.planStateService
    .getPlan(this.data.planningAreaId + '')
    .pipe(shareReplay());

  planCreator$ = this.plan$.pipe(map((plan) => plan.creator));

  invites$ = this.inviteService
    .getInvites(this.data.planningAreaId)
    .pipe(tap((_) => (this.isLoading = false)));

  fullname$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    map((user) => [user.firstName, user.lastName].join(' '))
  );

  showCreator$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user),
    switchMap((user) =>
      this.plan$.pipe(
        map((plan) => {
          return user.id != plan.user;
        })
      )
    )
  );

  roles: INVITE_ROLE[] = Object.keys(Roles) as INVITE_ROLE[];

  selectedRole = this.roles[0] as INVITE_ROLE;

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
      .inviteUsers(
        this.emails,
        this.selectedRole,
        this.data.planningAreaId,
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

  get showMessageBox() {
    return this.invalidEmail || this.emails.length > 0;
  }

  startOver() {
    this.invalidEmail = false;
    this.emails = [];
  }

  changeRole(invite: Invite, newRole: INVITE_ROLE) {
    this.inviteService
      .changeRole(this.data.planningAreaId, invite.id, newRole)
      .subscribe({
        next: (result) => {
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
      .inviteUsers([invite.email], this.selectedRole, this.data.planningAreaId)
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

  removeAccess(invite: Invite) {
    this.showSnackbar(`Removed  ${invite.email}`);
  }

  private showSnackbar(message: string) {
    this.matSnackBar.open(message, 'Dismiss', SNACK_BOTTOM_NOTICE_CONFIG);
  }
}

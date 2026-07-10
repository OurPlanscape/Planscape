import { Component, Inject } from '@angular/core';

import { Invite, INVITE_ROLE, Plan, User } from '@types';
import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import { AuthService, InvitesService } from '@services';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  RoleChange,
  SharePerson,
  SharePrimaryEvent,
} from '@styleguide/share-dialog/share-dialog.component';

const ROLES: INVITE_ROLE[] = ['Viewer', 'Collaborator', 'Owner'];

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

  submitting = false;
  isLoading = true;
  roles = ROLES;

  /** Latest invites, kept so row actions can resolve an invite by id. */
  private invitesSnapshot: Invite[] = [];
  private reload$ = new BehaviorSubject<void>(undefined);

  private invites$ = this.reload$.pipe(
    switchMap(() => this.inviteService.getInvites(this.data.plan.id)),
    tap((invites) => (this.invitesSnapshot = invites))
  );

  private user$ = this.authService.loggedInUser$.pipe(
    filter((user): user is User => !!user)
  );

  people$ = combineLatest([this.invites$, this.user$]).pipe(
    map(([invites, user]) => this.buildRows(invites, user)),
    tap(() => (this.isLoading = false))
  );

  private buildRows(invites: Invite[], user: User): SharePerson[] {
    const rows: SharePerson[] = [];
    if (user.id != this.data.plan.user) {
      rows.push({
        name: this.data.plan.creator,
        role: 'Creator',
        editable: false,
      });
    }
    rows.push({
      name: `${[user.firstName, user.lastName].join(' ')} (You)`,
      role: this.data.plan.role,
      editable: false,
    });
    for (const invite of invites) {
      rows.push({
        id: invite.id,
        name: invite.collaborator_name || invite.email,
        role: invite.role,
        editable: true,
      });
    }
    return rows;
  }

  close() {
    this.dialogRef.close();
  }

  onPrimary(event: SharePrimaryEvent) {
    if (event.emails.length === 0) {
      this.close();
      return;
    }
    this.submitting = true;
    this.inviteService
      .inviteUsers(
        event.emails,
        (event.role as INVITE_ROLE) ?? ROLES[0],
        this.data.plan.id,
        event.message
      )
      .subscribe({
        next: () => {
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

  onChangeRole(event: RoleChange) {
    if (event.person.id == null) {
      return;
    }
    this.inviteService
      .changeRole(Number(event.person.id), event.role as INVITE_ROLE)
      .subscribe({
        next: () => this.showSnackbar('Access Updated'),
        error: () => {
          this.showSnackbar(
            `There was an error trying to update the role of ${event.person.name}. Please try again.`
          );
          // Roll back the optimistic update by reloading the authoritative list.
          this.reload$.next();
        },
      });
  }

  onResend(person: SharePerson) {
    const invite = this.invitesSnapshot.find((i) => i.id === person.id);
    if (!invite) {
      return;
    }
    this.inviteService
      .inviteUsers(
        [invite.email],
        invite.role as INVITE_ROLE,
        this.data.plan.id
      )
      .subscribe({
        next: () => this.showSnackbar(`Email sent to ${invite.email}`),
        error: () =>
          this.showSnackbar(
            `There was an error trying to resend code to ${invite.email}. Please try again.`
          ),
      });
  }

  onRemoveAccess(person: SharePerson) {
    if (person.id == null) {
      return;
    }
    this.inviteService.deleteInvite(Number(person.id)).subscribe({
      next: () => {
        this.showSnackbar(`Removed ${person.name}`);
        this.reload$.next();
      },
      error: () =>
        this.showSnackbar(
          `There was an error trying to revoke access for ${person.name}. Please try again.`
        ),
    });
  }

  private showSnackbar(message: string) {
    this.matSnackBar.open(message, 'Dismiss', SNACK_BOTTOM_NOTICE_CONFIG);
  }
}

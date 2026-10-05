import { Component, Inject } from '@angular/core';
import { AsyncPipe, NgFor } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, switchMap, tap } from 'rxjs';

import { SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import {
  RoleChange,
  ShareDialogComponent as SgShareDialogComponent,
  SharePerson,
  SharePrimaryEvent,
} from '@styleguide/share-dialog/share-dialog.component';
import { ShareTargetFactory } from '../share-target.factory';
import { ShareDialogData, ShareTarget } from '../share-target';

/**
 * Share modal for anything that can be shared. The entity-specific bits — the
 * access list, the roles and the calls behind each row action — come from the
 * `ShareTarget` built for whatever the dialog was opened with.
 */
@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [AsyncPipe, NgFor, SgShareDialogComponent],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent {
  target: ShareTarget;

  constructor(
    private matSnackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ShareDialogComponent>,
    shareTargets: ShareTargetFactory,
    @Inject(MAT_DIALOG_DATA) data: ShareDialogData
  ) {
    this.target = shareTargets.create(data);
  }

  submitting = false;
  isLoading = true;

  private reload$ = new BehaviorSubject<void>(undefined);

  people$ = this.reload$.pipe(
    switchMap(() => this.target.people()),
    tap(() => (this.isLoading = false))
  );

  close() {
    this.dialogRef.close();
  }

  onPrimary(event: SharePrimaryEvent) {
    if (event.emails.length === 0) {
      this.close();
      return;
    }
    this.submitting = true;
    this.target
      .invite(event.emails, event.role ?? '', event.message)
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
    this.target.changeRole(event.person, event.role).subscribe({
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
    this.target.resend(person).subscribe({
      next: () => this.showSnackbar(`Email sent to ${person.name}`),
      error: () =>
        this.showSnackbar(
          `There was an error trying to resend code to ${person.name}. Please try again.`
        ),
    });
  }

  onRemoveAccess(person: SharePerson) {
    this.target.removeAccess(person).subscribe({
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

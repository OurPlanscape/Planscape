import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { delay, of } from 'rxjs';
import { FormMessageType } from '../../types';
import { SNACK_NOTICE_CONFIG } from '../../shared/constants';
import { MatSnackBar } from '@angular/material/snack-bar';

const Roles: Record<'Viewer' | 'Collaborator' | 'Owner', string> = {
  Viewer: 'Viewer',
  Collaborator: 'Collaborator',
  Owner: 'Owner',
};

export interface Invite {
  name: string;
  role: string;
  email: string;
}

@Component({
  selector: 'app-share-plan-dialog',
  templateUrl: './share-plan-dialog.component.html',
  styleUrls: ['./share-plan-dialog.component.scss'],
})
export class SharePlanDialogComponent {
  constructor(
    private matSnackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SharePlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string }
  ) {}

  emails: string[] = [];
  errorType = FormMessageType.ERROR;
  invalidEmail = false;
  showHelp = false;
  submitting = false;
  message = '';

  invites$ = of([
    { name: 'John Doe', role: 'Owner', email: 'john@doe.com' },
    { name: 'Richard Doe', role: 'Collaborator', email: 'richard@doe.com' },
    { name: 'John Doe', role: 'Owner', email: 'john@doe.com' },
    { name: 'Richard Doe', role: 'Collaborator', email: 'richard@doe.com' },
    { name: 'John Doe', role: 'Owner', email: 'john@doe.com' },
    { name: 'Richard Doe', role: 'Collaborator', email: 'richard@doe.com' },
    { name: 'John Doe', role: 'Owner', email: 'john@doe.com' },
    { name: 'Richard Doe', role: 'Collaborator', email: 'richard@doe.com' },
  ] as Invite[]);

  roles = Object.keys(Roles);

  selectedRole = this.roles[0];

  // placeholder until we develop this feature
  invitesHaveChanges = false;

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
    const payload = { emails: this.emails, message: this.message };
    of(payload)
      .pipe(delay(500))
      .subscribe((result) => {
        // TODO add snack bar.
        this.matSnackBar.open('Access Updated', 'Dismiss', SNACK_NOTICE_CONFIG);
        this.close();
      });
  }

  get showMessageBox() {
    return this.invalidEmail || this.emails.length > 0;
  }

  startOver() {
    this.invalidEmail = false;
    this.emails = [];
  }

  // TODO placeholder
  changeRole(invite: Invite) {
    this.invitesHaveChanges = !!invite;
  }
}

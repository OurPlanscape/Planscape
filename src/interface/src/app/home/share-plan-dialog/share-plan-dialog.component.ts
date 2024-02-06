import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { delay, of } from 'rxjs';
import { FormMessageType } from '../../types';
import {
  EMAIL_VALIDATION_REGEX,
  SNACK_NOTICE_CONFIG,
} from '../../shared/constants';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

const Roles: Record<'Viewer' | 'Collaborator' | 'Owner', string> = {
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
  ]);

  roles = Object.keys(Roles);

  selectedRole = this.roles[0];

  addEmail(event: MatChipInputEvent): void {
    this.invalidEmail = false;
    const value = (event.value || '').trim();
    if (!value) {
      return;
    }

    if (value.match(EMAIL_VALIDATION_REGEX)) {
      this.emails.push(value);
    } else {
      this.invalidEmail = true;
      return;
    }

    // Clear the input value
    event.chipInput!.clear();
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
}

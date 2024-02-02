import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MatChipInputEvent } from '@angular/material/chips';
import { FormMessageType } from '../../types';

@Component({
  selector: 'app-share-plan-dialog',
  templateUrl: './share-plan-dialog.component.html',
  styleUrls: ['./share-plan-dialog.component.scss'],
})
export class SharePlanDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}

  emails: string[] = ['joe@google.com', 'jane@google.com'];
  errorType = FormMessageType.ERROR;
  invalidEmail = false;
  showHelp = false;

  invites$ = of([
    { name: 'John Doe', role: 'Owner', email: 'john@doe.com' },
    { name: 'Richard Doe', role: 'Collaborator', email: 'richard@doe.com' },
  ]);

  addEmail(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      this.emails.push(value);
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
}

import {Component, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

/**  Component for reset password confirmation dialog. */
@Component({
  selector: 'validation-email-dialog',
  templateUrl: './validation-email-dialog.component.html',
})
export class ValidationEmailDialog {
  protected readonly checkUrl = "/assets/png/gm_done_gm_grey_24dp.png";

  constructor(
      private readonly dialogRef: MatDialogRef<ValidationEmailDialog>,
  ) {}

  protected close() {
    this.dialogRef.close({});
  }

  resendEmail() {
    
  }
}
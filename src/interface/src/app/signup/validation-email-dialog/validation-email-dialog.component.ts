import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { AuthService } from '../../services';

/**  Component for reset password confirmation dialog. */
@Component({
  selector: 'validation-email-dialog',
  templateUrl: './validation-email-dialog.component.html',
})
export class ValidationEmailDialog {
  protected readonly checkUrl = "/assets/png/gm_done_gm_grey_24dp.png";
  constructor(
      private authService: AuthService,
      @Inject(MAT_DIALOG_DATA) readonly data: string,
      private readonly dialogRef: MatDialogRef<ValidationEmailDialog>,
  ) {}

  protected close() {
    this.dialogRef.close();
  }

  resendEmail() {
    this.authService.resendValidationEmail(this.data).subscribe();
  }
}
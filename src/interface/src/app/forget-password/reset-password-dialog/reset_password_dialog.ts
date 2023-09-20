import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';

/**  Component for reset password confirmation dialog. */
@Component({
  selector: 'app-reset-password-dialog',
  templateUrl: './reset_password_dialog.html',
})
export class ResetPasswordDialog {
  protected readonly checkUrl = '/assets/png/gm_done_gm_grey_24dp.png';

  constructor(
    private readonly dialogRef: MatDialogRef<ResetPasswordDialog>,
    private router: Router
  ) { }

  protected close() {
    this.dialogRef.close({});
    this.router.navigate(['home']);
  }
}

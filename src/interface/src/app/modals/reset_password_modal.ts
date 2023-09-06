import {Component, Inject} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';

/** Compose Email modal for activities */
@Component({
  selector: 'reset-password-modal',
  templateUrl: 'reset_password_modal.ng.html',
  standalone: true,
  styleUrls: ['./reset_password_modal.scss'],
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
})
export class ResetPasswordsModal {
  constructor(
      @Inject(MAT_DIALOG_DATA) public data: {
        message: string,
        to: string,
      },
  ) {}

  handleResetEmail() {
    // TODO: sterlingwellscaffeine
    // Send a request to the backend server to create a reset email.
  }
}
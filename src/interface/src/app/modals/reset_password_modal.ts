import {Component, Inject} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

/** Compose Email modal for activities */
@Component({
  selector: 'reset-password-modal',
  templateUrl: 'reset_password_modal.ng.html',
  standalone: true,
  styleUrls: ['./reset_password_modal.scss'],
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
  ],
})
export class ResetPasswordsModal {
  form: FormGroup;

  constructor(
      @Inject(MAT_DIALOG_DATA) public data: {
        message: string,
        to: string,
      },
      private formBuilder: FormBuilder,
  ) {
    this.form = this.formBuilder.group({
        email: this.formBuilder.control('', [
          Validators.required,
          Validators.email,
        ]),
        password: this.formBuilder.control('', Validators.required),
      });
  }

  handleResetEmail() {
    // TODO: sterlingwellscaffeine
    // Send a request to the backend server to create a reset email.
  }
}
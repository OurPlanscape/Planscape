import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { AuthService } from '@services';
import { User } from '@types';

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: './delete-account-dialog.component.html',
  styleUrls: ['./delete-account-dialog.component.scss'],
})
export class DeleteAccountDialogComponent {
  deleteAccountForm: FormGroup;
  disableDeleteButton: boolean = false;
  error: any;

  constructor(
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) private data: { user: User },
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeleteAccountDialogComponent>
  ) {
    this.deleteAccountForm = this.fb.group({
      currentPassword: this.fb.control('', [Validators.required]),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  deleteAccount(): void {
    this.disableDeleteButton = true;
    this.authService
      .deactivateUser(
        this.data.user,
        this.deleteAccountForm.get('currentPassword')?.value
      )
      .subscribe({
        next: () => {
          this.dialogRef.close({
            deletedAccount: true,
          });
        },
        error: (err) => {
          if (err.status === 403) {
            this.error = 'Password was incorrect.';
          } else if (err.status === 401) {
            this.error = 'User is not logged in.';
          } else {
            this.error = 'An unknown error has occured.';
          }
          this.disableDeleteButton = false;
        },
      });
  }
}

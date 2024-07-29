import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from 'src/styleguide/modal/modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '@services';
import { User } from '@types';

export interface DialogData {
  user: User;
}

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: 'delete-account-dialog.component.html',
  styleUrl: 'delete-account-dialog.component.scss',
  standalone: true,
  imports: [
    ModalComponent,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule,
    NgIf,
  ],
})
export class DeleteAccountDialogComponent {
  deleteAccountForm: FormGroup;
  disableDeleteButton: boolean = false;
  error: any;
  readonly dialogRef = inject(MatDialogRef<DeleteAccountDialogComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.deleteAccountForm = this.fb.group({
      currentPassword: this.fb.control('', [Validators.required]),
    });
  }

  closeModal(): void {
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

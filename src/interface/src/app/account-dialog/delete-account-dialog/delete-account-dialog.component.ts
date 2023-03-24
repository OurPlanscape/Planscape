import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/services';
import { User } from 'src/app/types';

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: './delete-account-dialog.component.html',
  styleUrls: ['./delete-account-dialog.component.scss'],
})
export class DeleteAccountDialogComponent {
  disableDeleteButton: boolean = false;
  error: any;

  constructor(
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) private data: { user: User },
    private dialogRef: MatDialogRef<DeleteAccountDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  deleteAccount(): void {
    this.disableDeleteButton = true;
    this.authService.deleteUser(this.data.user).subscribe(
      (_) => {
        this.dialogRef.close({
          deletedAccount: true,
        });
      },
      (err) => {
        this.error = err.error;
        this.disableDeleteButton = false;
      }
    );
  }
}

import { Component, Inject } from '@angular/core';
import { ModalComponent } from '@styleguide/modal/modal.component';
import { ModalConfirmationDialogComponent } from '@styleguide/modal-confirmation-dialog/modal-confirmation-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogData } from '../dialogs';

@Component({
  selector: 'sg-error-dialog',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './error-dialog.component.html',
})
export class ErrorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: DialogData,
    public dialogRef: MatDialogRef<ErrorDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

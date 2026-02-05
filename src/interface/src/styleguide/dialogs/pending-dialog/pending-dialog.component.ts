import { Component, Inject } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogData } from '@styleguide/dialogs/dialogs';
import { ModalComponent } from '@styleguide/modal/modal.component';
import { ModalConfirmationDialogComponent } from '@styleguide/modal-confirmation-dialog/modal-confirmation-dialog.component';

@Component({
  selector: 'sg-pending-dialog',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './pending-dialog.component.html',
})
export class PendingDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: DialogData,
    public dialogRef: MatDialogRef<PendingDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

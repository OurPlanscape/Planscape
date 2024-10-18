import { Component, Inject } from '@angular/core';
import { ModalComponent, ModalConfirmationDialogComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogData } from '../dialogs';

@Component({
  selector: 'app-pending-dialog',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './pending-dialog.component.html',
  styleUrl: './pending-dialog.component.scss',
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

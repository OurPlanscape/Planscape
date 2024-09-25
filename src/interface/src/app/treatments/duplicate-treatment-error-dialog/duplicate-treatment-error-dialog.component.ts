import { Component, Inject } from '@angular/core';
import { ModalComponent, ModalConfirmationDialogComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-duplicate-treatment-error-dialog',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './duplicate-treatment-error-dialog.component.html',
  styleUrl: './duplicate-treatment-error-dialog.component.scss',
})
export class DuplicateTreatmentErrorDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<DuplicateTreatmentErrorDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

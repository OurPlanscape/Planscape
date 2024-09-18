import { Component, Inject } from '@angular/core';
import { ModalComponent } from '../../../styleguide/modal/modal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-after-duplicate-treatment-dialog',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './after-duplicate-treatment-dialog.component.html',
  styleUrl: './after-duplicate-treatment-dialog.component.scss',
})
export class AfterDuplicateTreatmentDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<AfterDuplicateTreatmentDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

import { Component, Inject, inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-exit-drawing-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './confirm-exit-drawing-modal.component.html',
  styleUrl: './confirm-exit-drawing-modal.component.scss',
})
export class ConfirmExitDrawingModalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  readonly dialogRef = inject(MatDialogRef<ConfirmExitDrawingModalComponent>);

  closeModal(): void {
    this.dialogRef.close(false);
  }

  goToTreatmentPlans(): void {
    this.dialogRef.close(true);
  }
}

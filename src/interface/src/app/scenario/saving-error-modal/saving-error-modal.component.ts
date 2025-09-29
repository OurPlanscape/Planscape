import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

@Component({
  selector: 'app-saving-error-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './saving-error-modal.component.html',
  styleUrl: './saving-error-modal.component.scss',
})
export class SavingErrorModalComponent {
  constructor(
    private dialogRef: MatDialogRef<SavingErrorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  cancelExit(): void {
    this.dialogRef.close(false);
  }

  confirmExit(): void {
    this.dialogRef.close(true);
  }
}

import { Component, Inject, Optional } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-scenario-dialog',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './delete-scenario-dialog.component.html',
})
export class DeleteScenarioDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<DeleteScenarioDialogComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: { name: string }
  ) {}

  confirmDelete(): void {
    this.dialogRef.close(true);
  }

  cancelDelete(): void {
    this.dialogRef.close(false);
  }

  get modalTitle() {
    return `Delete "${this.data?.name}"`;
  }
}

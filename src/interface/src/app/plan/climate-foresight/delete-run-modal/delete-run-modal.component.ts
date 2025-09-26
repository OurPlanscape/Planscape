import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { ModalComponent } from '@styleguide';

export interface DeleteRunModalData {
  runName: string;
}

@Component({
  selector: 'app-delete-run-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ModalComponent],
  templateUrl: './delete-run-modal.component.html',
  styleUrls: ['./delete-run-modal.component.scss'],
})
export class DeleteRunModalComponent {
  constructor(
    private dialogRef: MatDialogRef<DeleteRunModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteRunModalData
  ) {}

  onDelete(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

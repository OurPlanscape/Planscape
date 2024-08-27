import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-note-dialog',
  templateUrl: './delete-note-dialog.component.html',
  styleUrl: './delete-note-dialog.component.scss',
})
export class DeleteNoteDialogComponent {
  disableDeleteButton = false;

  constructor(private dialogRef: MatDialogRef<DeleteNoteDialogComponent>) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  deleteNote(): void {
    this.disableDeleteButton = true;
    this.dialogRef.close(true);
  }
}

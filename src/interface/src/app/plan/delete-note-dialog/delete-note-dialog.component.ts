import { Component } from '@angular/core';

// import { MatDialog } from '@angular/material/dialog';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-delete-note-dialog',
  templateUrl: './delete-note-dialog.component.html',
  styleUrl: './delete-note-dialog.component.scss',
})
export class DeleteNoteDialogComponent {
  disableDeleteButton: boolean = false;
  error: any;
  constructor(private dialogRef: MatDialogRef<DeleteNoteDialogComponent>) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  deleteNote(): void {
    this.disableDeleteButton = true;
    this.dialogRef.close(true);
  }
}
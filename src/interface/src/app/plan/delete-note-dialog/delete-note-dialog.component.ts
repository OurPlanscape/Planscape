import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-delete-note-dialog',
  templateUrl: './delete-note-dialog.component.html',
  styleUrl: './delete-note-dialog.component.scss',
})
export class DeleteNoteDialogComponent {
  deleteAccountForm: FormGroup;
  disableDeleteButton: boolean = false;
  error: any;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeleteNoteDialogComponent>
  ) {
    this.deleteAccountForm = this.fb.group({
      currentPassword: this.fb.control('', [Validators.required]),
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  deleteNote(): void {
    this.disableDeleteButton = true;
    // TODO: actually delete things, and then move this to subscribe...
    console.log('deleting note...');

    //TODO: then
    this.dialogRef.close(true);
  }
}

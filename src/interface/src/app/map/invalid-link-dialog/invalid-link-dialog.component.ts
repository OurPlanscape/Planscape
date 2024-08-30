import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-invalid-link-dialog',
  templateUrl: './invalid-link-dialog.component.html',
  styleUrls: ['./invalid-link-dialog.component.scss'],
})
export class InvalidLinkDialogComponent {
  constructor(private dialogRef: MatDialogRef<InvalidLinkDialogComponent>) {}

  cancel(): void {
    this.dialogRef.close();
  }
}

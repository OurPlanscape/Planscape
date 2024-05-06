import { Component, Inject } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'app-delete-dialog',
  templateUrl: './delete-dialog.component.html',
  styleUrls: ['./delete-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MaterialModule],
})
export class DeleteDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { name: string },
    public dialogRef: MatDialogRef<DeleteDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

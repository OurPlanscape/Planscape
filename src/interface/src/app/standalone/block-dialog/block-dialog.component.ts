import { Component, Inject } from '@angular/core';
import { ModalComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-block-dialog',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './block-dialog.component.html',
})
export class BlockDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      body: string;
      primaryCta?: string;
    },
    public dialogRef: MatDialogRef<BlockDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }
}

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-outside-region-dialog',
  templateUrl: './outside-region-dialog.component.html',
  styleUrls: ['./outside-region-dialog.component.scss'],
})
export class OutsideRegionDialogComponent {
  constructor(private dialogRef: MatDialogRef<OutsideRegionDialogComponent>) {}

  cancel(): void {
    this.dialogRef.close();
  }
}

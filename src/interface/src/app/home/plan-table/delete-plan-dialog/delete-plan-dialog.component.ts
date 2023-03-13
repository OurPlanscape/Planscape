import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-plan-dialog',
  templateUrl: './delete-plan-dialog.component.html',
  styleUrls: ['./delete-plan-dialog.component.scss'],
})
export class DeletePlanDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: string[],
    public dialogRef: MatDialogRef<DeletePlanDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

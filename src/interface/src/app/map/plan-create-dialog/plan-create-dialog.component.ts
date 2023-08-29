import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { Component } from '@angular/core';

@Component({
  selector: 'app-plan-create-dialog',
  templateUrl: './plan-create-dialog.component.html',
  styleUrls: ['./plan-create-dialog.component.scss'],
})
export class PlanCreateDialogComponent {
  planNameControl = new FormControl('', Validators.required);

  constructor(private dialogRef: MatDialogRef<PlanCreateDialogComponent>) {}

  submit() {
    this.dialogRef.close(this.planNameControl);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

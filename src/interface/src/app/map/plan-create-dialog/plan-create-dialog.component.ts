import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Component } from '@angular/core';

@Component({
  selector: 'app-plan-create-dialog',
  templateUrl: './plan-create-dialog.component.html',
  styleUrls: ['./plan-create-dialog.component.scss'],
})
export class PlanCreateDialogComponent {
  planForm = new FormGroup({
    planName: new FormControl('', Validators.required),
  });

  constructor(private dialogRef: MatDialogRef<PlanCreateDialogComponent>) {}

  submit() {
    if (this.planForm.valid) {
      this.dialogRef.close(this.planForm.get('planName'));
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

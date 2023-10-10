import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Component } from '@angular/core';
import { PlanService } from '../../services';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plan-create-dialog',
  templateUrl: './plan-create-dialog.component.html',
  styleUrls: ['./plan-create-dialog.component.scss'],
})
export class PlanCreateDialogComponent {
  planForm = new FormGroup({
    planName: new FormControl('', Validators.required),
  });

  constructor(
    private dialogRef: MatDialogRef<PlanCreateDialogComponent>,
    private planService: PlanService
  ) {}

  async submit() {
    if (this.planForm.valid) {
      const planExists = await firstValueFrom(
        this.planService.planNameExists(
          this.planForm.get('planName')?.value || ''
        )
      );
      if (planExists) {
        this.planForm.setErrors({ notValid: planExists });
        return;
      }
      this.dialogRef.close(this.planForm.get('planName'));
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

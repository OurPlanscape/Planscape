import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Component, Inject } from '@angular/core';
import { PlanService, SessionService } from '../../services';
import { firstValueFrom } from 'rxjs';
import { ERROR_SNACK_CONFIG } from '../map.constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Region } from '../../types';

export interface PlanCreateDialogData {
  shape: GeoJSON.GeoJSON;
}

@Component({
  selector: 'app-plan-create-dialog',
  templateUrl: './plan-create-dialog.component.html',
  styleUrls: ['./plan-create-dialog.component.scss'],
})
export class PlanCreateDialogComponent {
  planForm = new FormGroup({
    planName: new FormControl('', Validators.required),
  });

  submitting = false;
  selectedRegion$ = this.sessionService.region$.asObservable();

  constructor(
    private dialogRef: MatDialogRef<PlanCreateDialogComponent>,
    private planService: PlanService,
    private sessionService: SessionService,
    private matSnackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: PlanCreateDialogData
  ) {}

  async submit() {
    if (this.planForm.valid) {
      this.submitting = true;
      const planExists = await firstValueFrom(
        this.planService.planNameExists(
          this.planForm.get('planName')?.value || ''
        )
      );
      if (planExists) {
        this.planForm.setErrors({ planNameExists: planExists });
        this.submitting = false;
        return;
      }
      const planName = this.planForm.get('planName')?.value || '';
      const region = await firstValueFrom(this.selectedRegion$);
      if (!region) {
        this.matSnackBar.open(
          '[Error] Please select a region!',
          'Dismiss',
          ERROR_SNACK_CONFIG
        );
        this.submitting = false;
        return;
      }
      this.createPlan(planName, this.data.shape, region);
    }
  }

  private createPlan(name: string, shape: GeoJSON.GeoJSON, region: Region) {
    this.planService
      .createPlan({
        name: name,
        region: region,
        planningArea: shape,
      })
      .subscribe({
        next: (result) => {
          this.dialogRef.close(result.result!.id);
          this.submitting = false;
        },
        error: (e) => {
          this.matSnackBar.open(
            '[Error] Unable to create plan due to backend error.',
            'Dismiss',
            ERROR_SNACK_CONFIG
          );
          this.submitting = false;
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

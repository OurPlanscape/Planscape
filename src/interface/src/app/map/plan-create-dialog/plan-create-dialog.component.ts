import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Component, Inject } from '@angular/core';
import { PlanService, SessionService } from '@services';
import { firstValueFrom } from 'rxjs';
import { SNACK_ERROR_CONFIG } from '@shared';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Region, regionToString } from '@types';
import { isValidTotalArea } from '../../plan/plan-helpers';
import { Geometry } from 'geojson';

export interface PlanCreateDialogData {
  shape: Geometry;
  totalArea: number;
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

  get isValidTotalArea() {
    return isValidTotalArea(this.data.totalArea);
  }

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
          SNACK_ERROR_CONFIG
        );
        this.submitting = false;
        return;
      }
      this.createPlan(planName, this.data.shape, region);
    }
  }

  private createPlan(name: string, geometry: Geometry, region: Region) {
    this.planService
      .createPlan({
        name: name,
        region_name: regionToString(region),
        geometry: geometry,
      })
      .subscribe({
        next: (result) => {
          this.dialogRef.close(result!.id);
          this.submitting = false;
        },
        error: (e) => {
          this.matSnackBar.open(
            '[Error] Unable to create plan due to backend error.',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          this.submitting = false;
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

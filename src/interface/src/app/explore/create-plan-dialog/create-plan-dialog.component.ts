import { Component, inject, Inject, OnInit } from '@angular/core';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanService } from '@services';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { isValidTotalArea } from '@plan/plan-helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '@services/analytics.service';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf } from '@angular/common';
import type { DrawService } from '@maplibre-map/draw.service';

@Component({
  selector: 'app-create-plan-dialog-component',
  standalone: true,
  imports: [
    NgIf,
    MatFormFieldModule,
    ReactiveFormsModule,
    ModalComponent,
    MatIconModule,
    InputDirective,
    InputFieldComponent,
    ModalInfoComponent,
  ],
  templateUrl: './create-plan-dialog.component.html',
  styleUrl: './create-plan-dialog.component.scss',
})
export class CreatePlanDialogComponent implements OnInit {
  displayError: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any, // Access the passed data
    private planService: PlanService,
    private matSnackBar: MatSnackBar,
    private analyticsService: AnalyticsService
  ) {
    this.drawService = data.drawService;
  }

  get editMode(): boolean {
    return this.data.planId !== undefined;
  }

  get primaryCTA(): string {
    if (this.displayError) {
      return 'Try Again';
    } else if (this.editMode) {
      return 'Done';
    }
    return 'Create';
  }

  planForm = new FormGroup({
    planName: new FormControl('', Validators.required),
  });
  drawService: DrawService;
  readonly dialogRef = inject(MatDialogRef<CreatePlanDialogComponent>);
  submitting = false;

  ngOnInit(): void {
    // In case we are in edit mode we prefill the plan name
    if (this.editMode) {
      this.planForm.get('planName')?.setValue(this.data.planName);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  get isValidTotalArea() {
    const area = this.drawService.getCurrentAcreageValue();
    return isValidTotalArea(area);
  }

  async submitPlan() {
    if (this.planForm.valid) {
      this.displayError = false;
      this.submitting = true;
      try {
        const planExists = await firstValueFrom(
          this.planService.planNameExists(
            this.planForm.get('planName')?.value ?? ''
          )
        );
        if (planExists) {
          this.planForm.setErrors({ planNameExists: planExists });
          this.submitting = false;
          return;
        }

        const planName = this.planForm.get('planName')?.value || '';
        if (this.editMode === true) {
          this.editPlanningAreaName(planName);
        } else {
          this.createPlan(planName);
        }
      } catch (error) {
        this.displayError = true;
        this.submitting = false;
      }
    }
  }

  private createPlan(name: string) {
    let geometry = null;
    if (this.drawService.hasUploadedData()) {
      geometry = this.drawService.getUploadedShape();
    } else {
      const shape = this.drawService.getDrawingGeoJSON();
      geometry = shape.geometry;
    }

    if (geometry) {
      this.planService
        .createPlan({
          name: name,
          geometry: geometry,
        })
        .subscribe({
          next: (result) => {
            this.dialogRef.close(result!.id);
            this.submitting = false;
            this.analyticsService.emitEvent(
              'polygons_draw_explore',
              undefined,
              undefined,
              (result as any).geometry?.coordinates?.length
            );
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
  }

  async editPlanningAreaName(name: string) {
    if (!this.data.planId) {
      return;
    }
    this.displayError = false;
    this.planService.editPlanName(this.data.planId, name).subscribe({
      next: (result) => {
        this.dialogRef.close(true);
        this.submitting = false;
        // Adding analytics in case we need to track this
        this.analyticsService.emitEvent(
          'planning_area_name_edited',
          undefined,
          undefined,
          result.id
        );
      },
      error: (e) => {
        // Display error message and try again
        this.displayError = true;
        this.submitting = false;
      },
    });
  }
}

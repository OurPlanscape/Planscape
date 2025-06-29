import { Component, inject, Inject } from '@angular/core';
import {
  ModalComponent,
  InputDirective,
  InputFieldComponent,
} from '@styleguide';
import { ModalInfoComponent } from 'src/styleguide/modal-info-box/modal-info.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DrawService } from '../draw.service';
import { PlanService } from '@services';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { isValidTotalArea } from '../../plan/plan-helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '@services/analytics.service';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-confirm-exit-drawing-modal',
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
  templateUrl: './explore-plan-create-dialog.component.html',
  styleUrl: './explore-plan-create-dialog.component.scss',
})
export class ExplorePlanCreateDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any, // Access the passed data
    private planService: PlanService,
    private matSnackBar: MatSnackBar,
    private analyticsService: AnalyticsService
  ) {
    this.drawServiceInstance = data.drawService;
  }

  planForm = new FormGroup({
    planName: new FormControl('', Validators.required),
  });
  drawServiceInstance: DrawService;
  readonly dialogRef = inject(MatDialogRef<ExplorePlanCreateDialogComponent>);
  submitting = false;

  cancel(): void {
    this.dialogRef.close(false);
  }

  get isValidTotalArea() {
    const area = this.drawServiceInstance.getCurrentAcreageValue();
    return isValidTotalArea(area);
  }

  async submitPlan() {
    if (this.planForm.valid) {
      this.submitting = true;
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
      this.createPlan(planName);
    } else {
    }
  }

  private createPlan(name: string) {
    const shape = this.drawServiceInstance.getDrawingGeoJSON();
    this.planService
      .createPlan({
        name: name,
        geometry: shape.geometry,
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

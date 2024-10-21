import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreatmentsRoutingModule } from './treatments-routing.module';
import { ReviewTreatmentPlanDialogComponent } from './review-treatment-plan-dialog/review-treatment-plan-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    TreatmentsRoutingModule,
    ReviewTreatmentPlanDialogComponent,
  ],
})
export class TreatmentsModule {}

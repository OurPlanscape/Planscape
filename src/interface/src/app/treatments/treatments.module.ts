import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreatmentsRoutingModule } from './treatments-routing.module';
import { ReviewTreatmentPlanDialogComponent } from '@treatments/review-treatment-plan-dialog/review-treatment-plan-dialog.component';
import { TreatmentToPDFService } from './treatment-to-pdf.service';
import { MapConfigService } from '@maplibre/map-config.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';

@NgModule({
  imports: [
    CommonModule,
    TreatmentsRoutingModule,
    ReviewTreatmentPlanDialogComponent,
  ],
  providers: [TreatmentToPDFService, MapConfigService, DataLayersStateService],
})
export class TreatmentsModule {
  constructor(mapConfigService: MapConfigService) {
    mapConfigService.initialize();
  }
}

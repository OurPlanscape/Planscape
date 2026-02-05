import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreatmentsRoutingModule } from '@app/treatments/treatments-routing.module';
import { ReviewTreatmentPlanDialogComponent } from '@app/treatments/review-treatment-plan-dialog/review-treatment-plan-dialog.component';
import { TreatmentToPDFService } from '@app/treatments/treatment-to-pdf.service';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

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

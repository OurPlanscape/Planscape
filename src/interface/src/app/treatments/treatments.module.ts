import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreatmentsRoutingModule } from './treatments-routing.module';
import { ReviewTreatmentPlanDialogComponent } from './review-treatment-plan-dialog/review-treatment-plan-dialog.component';
import { TreatmentToPDFService } from 'src/app/treatments/treatment-to-pdf.service';
import { MapConfigService } from '../maplibre-map/map-config.service';
import { DataLayersStateService } from '../data-layers/data-layers.state.service';

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

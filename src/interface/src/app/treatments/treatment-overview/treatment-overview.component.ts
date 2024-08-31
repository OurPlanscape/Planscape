import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatmentsState } from '../treatments.state';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    JsonPipe,
    AsyncPipe,
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    MapBaseLayerComponent,
  ],
  providers: [MapConfigState, SelectedStandsState, TreatedStandsState],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  scenarioId: number = this.route.snapshot.data['scenarioId'];

  treatmentPlan$ = this.treatmentsState.treatmentPlan;

  constructor(
    private route: ActivatedRoute,
    private treatmentsState: TreatmentsState
  ) {}
}

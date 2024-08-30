import { Component, OnInit } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { ActivatedRoute } from '@angular/router';
import { JsonPipe } from '@angular/common';
import { TreatmentPlan } from '@types';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [
    JsonPipe,
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    MapBaseLayerComponent,
  ],
  providers: [MapConfigState, SelectedStandsState, TreatedStandsState],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent implements OnInit {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  treatmentPlan: TreatmentPlan | null = null;
  scenarioId: number = this.route.snapshot.data['scenarioId'];

  constructor(
    private treatmentsService: TreatmentsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlan(Number(this.treatmentPlanId))
        .subscribe((r) => (this.treatmentPlan = r));
    }
  }
}

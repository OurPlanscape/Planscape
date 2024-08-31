import { Component } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';

@Component({
  selector: 'app-treatment-project-area',
  standalone: true,
  imports: [
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    JsonPipe,
    AsyncPipe,
    PrescriptionActionsComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  projectAreaId: number = this.route.snapshot.data['projectAreaId'];

  constructor(private route: ActivatedRoute) {}
}

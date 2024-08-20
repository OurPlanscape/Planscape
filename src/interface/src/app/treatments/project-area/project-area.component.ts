import { Component, OnInit } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { TreatmentPlan } from '@types';
import { TreatmentsService } from '@services/treatments.service';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';

@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    JsonPipe,
    AsyncPipe,
    PrescriptionActionsComponent,
  ],
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  treatmentPlanId: number = this.route.snapshot.data['treatmentId'];
  projectAreaId: number = this.route.snapshot.data['projectAreaId'];

  treatmentPlan: TreatmentPlan | null = null;

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

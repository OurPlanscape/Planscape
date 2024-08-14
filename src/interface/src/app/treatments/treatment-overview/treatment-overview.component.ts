import { Component, OnInit } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { ActivatedRoute } from '@angular/router';
import { JsonPipe } from '@angular/common';
import { TreatmentPlan } from '@types';

@Component({
  selector: 'app-treatment-overview',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './treatment-overview.component.html',
  styleUrl: './treatment-overview.component.scss',
})
export class TreatmentOverviewComponent implements OnInit {
  treatmentPlanId = this.route.snapshot.paramMap.get('treatmentId');
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

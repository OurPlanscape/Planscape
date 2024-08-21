import { Component, Input, OnInit } from '@angular/core';
import { Summary, TreatmentsService } from '@services/treatments.service';
import { JsonPipe, NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-treatment-summary',
  standalone: true,
  imports: [JsonPipe, NgForOf, NgIf, RouterLink],
  templateUrl: './treatment-summary.component.html',
  styleUrl: './treatment-summary.component.scss',
})
export class TreatmentSummaryComponent implements OnInit {
  @Input() treatmentPlanId!: number;

  summary: Summary | null = null;

  constructor(private treatmentsService: TreatmentsService) {}

  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlanSummary(this.treatmentPlanId)
        .subscribe((r) => (this.summary = r));
    }
  }
}

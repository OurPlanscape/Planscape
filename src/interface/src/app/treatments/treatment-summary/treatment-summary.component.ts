import { Component, Input, OnInit } from '@angular/core';
import {
  Summary,
  TreatedStand,
  TreatmentsService,
} from '@services/treatments.service';
import { JsonPipe, NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

/**
 * placeholder component to display project areas.
 * To be replaced with project area expander
 */
@Component({
  selector: 'app-treatment-summary',
  standalone: true,
  imports: [JsonPipe, NgForOf, NgIf, RouterLink],
  templateUrl: './treatment-summary.component.html',
  styleUrl: './treatment-summary.component.scss',
})
export class TreatmentSummaryComponent implements OnInit {
  @Input() treatmentPlanId!: number;
  @Input() projectAreaId?: number;

  summary: Summary | null = null;

  constructor(
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState
  ) {}

  ngOnInit(): void {
    if (this.treatmentPlanId) {
      this.treatmentsService
        .getTreatmentPlanSummary(this.treatmentPlanId, this.projectAreaId)
        .subscribe((summary) => this.processSummary(summary));
    }
  }

  processSummary(summary: Summary) {
    this.summary = summary;
    // now process the treated stands
    const treatedStands: TreatedStand[] = this.summary.project_areas.flatMap(
      (pa) =>
        pa.prescriptions.flatMap((prescription) =>
          // treated stands, at least action + stand id
          prescription.stand_ids.map((standId) => {
            return { id: standId, action: prescription.action };
          })
        )
    );
    this.treatedStandsState.updateTreatedStands(treatedStands);
  }
}

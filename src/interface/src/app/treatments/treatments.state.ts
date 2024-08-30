import { Injectable } from '@angular/core';
import {
  Summary,
  TreatedStand,
  TreatmentsService,
} from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';

@Injectable()
export class TreatmentsState {
  constructor(
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState
  ) {}

  summary: Summary | null = null;

  loadSummary(treatmentPlanId: number, projectAreaId?: number) {
    this.treatmentsService
      .getTreatmentPlanSummary(treatmentPlanId, projectAreaId)
      .subscribe((summary) => this.processSummary(summary));
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

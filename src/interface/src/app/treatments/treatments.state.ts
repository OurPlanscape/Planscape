import { Injectable } from '@angular/core';
import {
  Summary,
  TreatedStand,
  TreatmentsService,
} from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable()
export class TreatmentsState {
  constructor(
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState
  ) {}

  private _summary$ = new BehaviorSubject<Summary | null>(null);
  public summary$ = this._summary$.asObservable();

  loadSummary(treatmentPlanId: number, projectAreaId?: number) {
    this.treatmentsService
      .getTreatmentPlanSummary(treatmentPlanId, projectAreaId)
      .subscribe((summary) => this.processSummary(summary));
  }

  processSummary(summary: Summary) {
    this._summary$.next(summary);
    // now process the treated stands
    const treatedStands: TreatedStand[] = summary.project_areas.flatMap((pa) =>
      pa.prescriptions.flatMap((prescription) =>
        // treated stands, at least action + stand id
        prescription.stand_ids.map((standId) => {
          return { id: standId, action: prescription.action };
        })
      )
    );
    this.treatedStandsState.setTreatedStands(treatedStands);
  }

  updateTreatedStands(
    treatmentPlanId: number,
    projectAreaId: number,
    action: string,
    standIds: number[]
  ) {
    // const currentTreatedStands = this.treatedStandsState.getTreatedStands();
    this.treatedStandsState.updateTreatedStands(
      standIds.map((standId) => ({ id: standId, action: action }))
    );
    // TODO return to currentTreatedStands on error.
    return this.treatmentsService
      .setTreatments(treatmentPlanId, projectAreaId, action, standIds)
      .pipe(tap((s) => {}));
  }
}

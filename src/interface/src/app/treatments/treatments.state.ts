import { Injectable } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { BehaviorSubject, catchError } from 'rxjs';
import { TreatedStand, TreatmentPlan, TreatmentSummary } from '@types';
import { MapConfigState } from './treatment-map/map-config.state';

/**
 * Class that holds data of the current state, and makes it available
 * through observables.
 */
@Injectable()
export class TreatmentsState {
  constructor(
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState
  ) {}

  private _treatmentPlanId: number | undefined = undefined;
  private _projectAreaId: number | undefined = undefined;
  private _scenarioId: number | undefined = undefined;

  private _summary$ = new BehaviorSubject<TreatmentSummary | null>(null);
  private _treatmentPlan = new BehaviorSubject<TreatmentPlan | null>(null);

  public summary$ = this._summary$.asObservable();
  public treatmentPlan$ = this._treatmentPlan.asObservable();

  getTreatmentPlanId() {
    if (this._treatmentPlanId === undefined) {
      throw new Error('no treatment plan id!');
    }
    return this._treatmentPlanId;
  }

  setTreatmentPlanId(value: number) {
    this._treatmentPlanId = value;
  }

  getProjectAreaId() {
    return this._projectAreaId;
  }

  setProjectAreaId(value: number | undefined) {
    this._projectAreaId = value;
  }

  getScenarioId(): number {
    if (this._scenarioId === undefined) {
      throw new Error('no _scenario id!');
    }
    return this._scenarioId;
  }

  setScenarioId(value: number) {
    this._scenarioId = value;
  }

  loadSummary() {
    // TODO caching
    this._summary$.next(null);
    this.treatedStandsState.setTreatedStands([]);
    return this.treatmentsService
      .getTreatmentPlanSummary(
        this.getTreatmentPlanId(),
        this.getProjectAreaId()
      )
      .subscribe((summary) => {
        this._summary$.next(summary);
        this.setTreatedStandsFromSummary(summary);
        this.mapConfigState.updateMapCenter(summary.extent);
      });
  }

  loadTreatmentPlan() {
    // TODO caching
    this._treatmentPlan.next(null);
    return this.treatmentsService
      .getTreatmentPlan(this.getTreatmentPlanId())
      .subscribe((treatmentPlan) => {
        this._treatmentPlan.next(treatmentPlan);
      });
  }

  private setTreatedStandsFromSummary(summary: TreatmentSummary) {
    const treatedStands: TreatedStand[] = summary.project_areas.flatMap((pa) =>
      pa.prescriptions.flatMap((prescription) =>
        prescription.stand_ids.map((standId) => {
          return { id: standId, action: prescription.action };
        })
      )
    );
    this.treatedStandsState.setTreatedStands(treatedStands);
  }

  updateTreatedStands(action: string, standIds: number[]) {
    const projectAreaId = this.getProjectAreaId();
    if (projectAreaId === undefined) {
      throw new Error('Project area Id is required to update stands');
    }
    const currentTreatedStands = this.treatedStandsState.getTreatedStands();
    this.treatedStandsState.updateTreatedStands(
      standIds.map((standId) => ({ id: standId, action: action }))
    );
    return this.treatmentsService
      .setTreatments(this.getTreatmentPlanId(), projectAreaId, action, standIds)
      .pipe(
        catchError((error) => {
          // rolls back to previous treated stands
          this.treatedStandsState.setTreatedStands(currentTreatedStands);
          throw error;
        })
      );
  }

  removeTreatments(standIds: number[]) {
    const currentTreatedStands = this.treatedStandsState.getTreatedStands();
    this.treatedStandsState.removeTreatments(standIds);
    return this.treatmentsService
      .removeTreatments(this.getTreatmentPlanId(), standIds)
      .pipe(
        catchError((error) => {
          // rolls back to previous treated stands
          this.treatedStandsState.setTreatedStands(currentTreatedStands);
          throw error;
        })
      );
  }
}
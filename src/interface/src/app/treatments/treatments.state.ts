import { Injectable } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
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
    // if I already have data avoid this and center?
    const summary = this._summary$.value;
    const projectAreaId = this.getProjectAreaId();
    if (summary && !projectAreaId) {
      this.mapConfigState.updateMapCenter(summary.extent);
      return of(true);
    }

    return this.treatmentsService
      .getTreatmentPlanSummary(this.getTreatmentPlanId())
      .pipe(
        map((summary) => {
          this._summary$.next(summary);
          this.setTreatedStandsFromSummary(summary);
          if (projectAreaId) {
            this.selectProjectArea(projectAreaId);
          } else {
            this.mapConfigState.updateMapCenter(summary.extent);
          }
          return true;
        })
      );
  }

  loadTreatmentPlan() {
    return this.treatmentsService
      .getTreatmentPlan(this.getTreatmentPlanId())
      .pipe(
        map((treatmentPlan) => {
          this._treatmentPlan.next(treatmentPlan);
          return true;
        })
      );
  }

  reset() {
    this._summary$.next(null);
    this.treatedStandsState.setTreatedStands([]);
    this._treatmentPlan.next(null);
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

  // TODO rename this
  selectProjectArea(projectAreaId: number) {
    const summary = this._summary$.value;

    if (!summary) {
      throw Error('no summary');
    }
    const projectArea = summary.project_areas.find(
      (pa) => pa.project_area_id === projectAreaId
    );
    if (!summary) {
      throw Error('no project area');
    }
    this.setProjectAreaId(projectAreaId);
    this.mapConfigState.updateShowTreatmentStands(true);
    this.mapConfigState.updateMapCenter(projectArea?.extent);
  }
}

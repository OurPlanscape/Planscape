import { Injectable } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
import {
  TreatedStand,
  TreatmentPlan,
  TreatmentProjectArea,
  TreatmentSummary,
} from '@types';
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

  private _activeProjectArea$ =
    new BehaviorSubject<TreatmentProjectArea | null>(null);

  public activeProjectArea$ = this._activeProjectArea$.asObservable();

  getTreatmentPlanId() {
    if (this._treatmentPlanId === undefined) {
      throw new Error('no treatment plan id!');
    }
    return this._treatmentPlanId;
  }

  getProjectAreaId() {
    return this._projectAreaId;
  }

  getScenarioId(): number {
    if (this._scenarioId === undefined) {
      throw new Error('no _scenario id!');
    }
    return this._scenarioId;
  }

  setInitialState(opts: {
    scenarioId: number;
    treatmentId: number;
    projectAreaId: number | undefined;
  }) {
    this._scenarioId = opts.scenarioId;
    this._treatmentPlanId = opts.treatmentId;
    this._projectAreaId = opts.projectAreaId;
  }

  loadSummaryForProjectArea() {
    const projectAreaId = this.getProjectAreaId();
    const summary = this._summary$.value;
    // if summary is already loaded, select project area and return
    if (!projectAreaId) {
      throw new Error('must provide projectAreaId');
    }

    if (summary && projectAreaId) {
      return of(true);
    }
    // if we don't have summary fetch data
    return this.treatmentsService
      .getTreatmentPlanSummary(this.getTreatmentPlanId())
      .pipe(
        map((summary) => {
          this._summary$.next(summary);
          this.setTreatedStandsFromSummary(summary.project_areas);
          this.selectProjectArea(projectAreaId);
          return true;
        })
      );
  }

  loadSummary() {
    const summary = this._summary$.value;
    // remove active project area
    this._activeProjectArea$.next(null);
    // if I already have summary center the map before fetching
    if (summary) {
      this.mapConfigState.updateMapCenter(summary.extent);
    }
    //fetch summary
    return this.treatmentsService
      .getTreatmentPlanSummary(this.getTreatmentPlanId())
      .pipe(
        map((summary) => {
          this._summary$.next(summary);
          this.setTreatedStandsFromSummary(summary.project_areas);
          this.mapConfigState.updateMapCenter(summary.extent);
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

  // TODO: allow us to set other values, besides name?
  updateTreatmentPlanName(name: string) {
    if (!this._treatmentPlan.value) {
      throw new Error('Treatment plan not available!');
    }
    return this.treatmentsService.updateTreatmentPlan(
      this.getTreatmentPlanId(),
      { name: name }
    );
  }

  private setTreatedStandsFromSummary(projectAreas: TreatmentProjectArea[]) {
    const treatedStands: TreatedStand[] = projectAreas.flatMap((pa) =>
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

  selectProjectArea(projectAreaId: number) {
    const summary = this._summary$.value;

    if (!summary) {
      throw Error('no summary');
    }
    const projectArea = summary.project_areas.find(
      (pa) => pa.project_area_id === projectAreaId
    );
    if (!projectArea) {
      throw Error('no project area');
    }
    this._projectAreaId = projectAreaId;
    this.mapConfigState.updateShowTreatmentStands(true);
    this.mapConfigState.updateMapCenter(projectArea?.extent);
    this._activeProjectArea$.next(projectArea);
    this.setTreatedStandsFromSummary([projectArea]);
  }

  getCurrentSummary() {
    const summary = this._summary$.value;
    if (!summary) {
      throw new Error('no summary loaded');
    }
    return summary;
  }
}

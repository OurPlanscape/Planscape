import { Injectable } from '@angular/core';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  Plan,
  TreatedStand,
  TreatmentPlan,
  TreatmentProjectArea,
  TreatmentSummary,
} from '@types';
import { MapConfigState } from '../maplibre-map/map-config.state';
import { NavState } from '@shared';
import { filter } from 'rxjs/operators';
import {
  ReloadTreatmentError,
  RemovingStandsError,
  UpdatingStandsError,
} from './treatment-errors';
import { TreatmentRoutingData } from './treatments-routing-data';
import { ActivatedRoute } from '@angular/router';
import { getPrescriptionsFromSummary } from './prescriptions';
import { DirectImpactsStateService } from './direct-impacts.state.service';
import { PlanState } from '../maplibre-map/plan.state';

/**
 * Class that holds data of the current state, and makes it available
 * through observables.
 */
@Injectable()
export class TreatmentsState {
  constructor(
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState,
    private route: ActivatedRoute,
    private directImpactsState: DirectImpactsStateService,
    private planState: PlanState
  ) {}

  private _treatmentPlanId: number | undefined = undefined;
  private _scenarioId: number | undefined = undefined;

  private _projectAreaId$ = new BehaviorSubject<number | undefined>(undefined);
  private _planningAreaId$ = new BehaviorSubject<number | undefined>(undefined);
  public projectAreaId$ = this._projectAreaId$.asObservable();

  private _summary$ = new BehaviorSubject<TreatmentSummary | null>(null);
  private _treatmentPlan = new BehaviorSubject<TreatmentPlan | null>(null);

  public summary$ = this._summary$.asObservable();
  public treatmentPlan$ = this._treatmentPlan.asObservable();

  public treatmentTypeOptions$ = combineLatest([
    this.summary$,
    this.directImpactsState.selectedProjectArea$.pipe(distinctUntilChanged()),
  ]).pipe(
    filter((summary) => summary !== null),
    map(([summary, project_area]) => {
      return getPrescriptionsFromSummary(summary, project_area).map(
        (p) => p.action
      );
    })
  );

  private _showApplyTreatmentsDialog$ = new BehaviorSubject(false);
  public showApplyTreatmentsDialog$ =
    this._showApplyTreatmentsDialog$.asObservable();

  public activeProjectArea$ = combineLatest([
    this.summary$,
    this._projectAreaId$.pipe(distinctUntilChanged()),
  ]).pipe(
    map(([summary, projectAreaId]) => {
      return summary?.project_areas.find(
        (p) => p.project_area_id === projectAreaId
      );
    })
  );

  public planningArea$: Observable<Plan | null> =
    this.planState.currentPlan$.pipe(filter((plan) => !!plan));

  // determine navstate values based on various state conditions
  navState$: Observable<NavState> = combineLatest([
    this.activeProjectArea$,
    this.summary$,
    this.treatmentPlan$,
  ]).pipe(
    map(([projectArea, summary, treatmentPlan]) => {
      const path = this.route.snapshot.routeConfig?.path;
      const navStateObject: NavState = {
        currentView: '',
        currentRecordName: '',
        backLink: '',
      };

      if (!summary) {
        return navStateObject;
      }
      if (path === 'impacts') {
        navStateObject.currentView = 'Direct Treatment Impacts';
      }

      if (projectArea) {
        // if we are currently viewing a Project Area
        navStateObject.currentView = 'Project Area';
        navStateObject.currentRecordName = projectArea.project_area_name;
        navStateObject.backLink = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}/treatment/${summary.treatment_plan_id}`;
      } else if (
        !!treatmentPlan &&
        !!treatmentPlan.name &&
        path === 'impacts'
      ) {
        // if we are currently viewing Treatment Impacts
        navStateObject.currentRecordName = treatmentPlan.name;
        navStateObject.backLink = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`;
      } else if (
        // if we are currently viewing a Treatment Plan
        !!treatmentPlan &&
        !!treatmentPlan.name &&
        treatmentPlan.status !== 'SUCCESS'
      ) {
        navStateObject.currentView = 'Treatment Plan';
        navStateObject.currentRecordName = treatmentPlan.name;
        navStateObject.backLink = `/plan/${summary.planning_area_id}/config/${summary.scenario_id}`;
      }
      return navStateObject;
    })
  );

  private _reloadingSummary$ = new BehaviorSubject(false);
  public reloadingSummary$ = this._reloadingSummary$.asObservable();

  getTreatmentPlanId() {
    if (this._treatmentPlanId === undefined) {
      throw new Error('no treatment plan id!');
    }
    return this._treatmentPlanId;
  }

  getProjectAreaId() {
    return this._projectAreaId$.value;
  }

  getScenarioId(): number {
    if (this._scenarioId === undefined) {
      throw new Error('no _scenario id!');
    }
    return this._scenarioId;
  }

  /**
   * Uses route data to load summary and treatment plan
   * returns true when both are loaded.
   * @param data
   */
  loadTreatmentByRouteData(data: TreatmentRoutingData) {
    this.setInitialState(data);

    return combineLatest([
      this.loadSummaryData(),
      this.loadTreatmentPlan(),
    ]).pipe(
      filter(([summaryData, treatmentPlan]) => {
        // Emit true only when both are loaded
        return !!summaryData && !!treatmentPlan;
      }),
      map(() => true)
    );
  }

  setInitialState(data: TreatmentRoutingData) {
    this._scenarioId = data.scenarioId;
    this._treatmentPlanId = data.treatmentId;
    this._projectAreaId$.next(data.projectAreaId);
    this._planningAreaId$.next(data.planId);

    // update config on map, based on route data
    this.mapConfigState.updateShowProjectAreas(
      data.showMapProjectAreas || false
    );
    this.mapConfigState.updateShowTreatmentStands(
      data.showTreatmentStands || false
    );
    this.mapConfigState.setStandSelectionEnabled(
      data.standSelectionEnabled || false
    );

    this.mapConfigState.setShowFillProjectAreas(
      data.showMapProjectAreas || false
    );

    this.mapConfigState.setTreatmentLegendVisible(false);
    this.mapConfigState.setShowMapControls(data.showMapControls || false);
  }

  private loadSummaryData() {
    const projectAreaId = this.getProjectAreaId();
    const previousSummary = this._summary$.value;

    if (projectAreaId && previousSummary) {
      // set active project area
      this.selectProjectArea(projectAreaId);
      // if we have a project area and loaded summary already, just return
      return of(true);
    } else {
      // if we have a previous summary, center the map immediately
      if (previousSummary) {
        this.mapConfigState.updateMapCenter(previousSummary.extent);
      }
    }

    return this.treatmentsService
      .getTreatmentPlanSummary(this.getTreatmentPlanId())
      .pipe(
        map((summary) => {
          // set summary data
          this._summary$.next(summary);
          if (!previousSummary) {
            // parse summary data into treated stands
            this.setTreatedStandsFromSummary(summary.project_areas);
          }

          if (projectAreaId) {
            // set active project area if provided
            this.selectProjectArea(projectAreaId);
          } else if (!previousSummary) {
            // if it's the first time loading summary, center the map
            this.mapConfigState.updateMapCenter(summary.extent);
          }
          return true;
        })
      );
  }

  reloadSummary() {
    this._reloadingSummary$.next(true);
    return this.treatmentsService
      .getTreatmentPlanSummary(this.getTreatmentPlanId())
      .pipe(
        map((summary) => {
          this._reloadingSummary$.next(false);
          this._summary$.next(summary);
        }),
        catchError(() => {
          throw new ReloadTreatmentError();
        })
      );
  }

  private loadTreatmentPlan() {
    return this.treatmentsService
      .getTreatmentPlan(this.getTreatmentPlanId())
      .pipe(
        map((treatmentPlan) => {
          this._treatmentPlan.next(treatmentPlan);
          return true;
        })
      );
  }

  updateTreatmentPlan(treatmentPlan: Partial<TreatmentPlan>) {
    return this.treatmentsService
      .updateTreatmentPlan(this.getTreatmentPlanId(), treatmentPlan)
      .pipe(
        tap((updatedTreatmentPlan: TreatmentPlan) => {
          this._treatmentPlan.next(updatedTreatmentPlan);
        })
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
    this._reloadingSummary$.next(true);
    return this.treatmentsService
      .setTreatments(this.getTreatmentPlanId(), projectAreaId, action, standIds)
      .pipe(
        // if setting treatments failed, rollback and throw error
        catchError(() => {
          this._reloadingSummary$.next(false);
          // rolls back to previous treated stands
          this.treatedStandsState.setTreatedStands(currentTreatedStands);
          // throws specific error message to identify on the component
          throw new UpdatingStandsError();
        }),
        // if no error, load summary
        switchMap(() => this.reloadSummary())
      );
  }

  removeTreatments(standIds: number[]) {
    const currentTreatedStands = this.treatedStandsState.getTreatedStands();
    this.treatedStandsState.removeTreatments(standIds);
    this._reloadingSummary$.next(true);
    return this.treatmentsService
      .removeTreatments(this.getTreatmentPlanId(), standIds)
      .pipe(
        catchError(() => {
          this._reloadingSummary$.next(false);
          // rolls back to previous treated stands
          this.treatedStandsState.setTreatedStands(currentTreatedStands);
          throw new RemovingStandsError();
        }),
        switchMap(() => this.reloadSummary())
      );
  }

  private selectProjectArea(projectAreaId: number, setStands = false) {
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

    this._projectAreaId$.next(projectAreaId);
    this.mapConfigState.updateShowTreatmentStands(true);
    this.mapConfigState.updateMapCenter(projectArea?.extent);
    if (setStands) {
      this.setTreatedStandsFromSummary([projectArea]);
    }
  }

  getCurrentSummary() {
    const summary = this._summary$.value;
    if (!summary) {
      throw new Error('no summary loaded');
    }
    return summary;
  }

  setShowApplyTreatmentsDialog(value: boolean) {
    this._showApplyTreatmentsDialog$.next(value);
  }

  runTreatmentPlan() {
    return this.treatmentsService.runTreatmentPlan(this.getTreatmentPlanId());
  }

  projectAreaCount() {
    const d = this._summary$.value;
    return d ? d.project_areas.length : 0;
  }

  getAcresForProjectArea(name: string) {
    const summary = this.getCurrentSummary();
    const pa = summary.project_areas.find((pa) => pa.project_area_name == name);
    if (!pa) {
      return 0;
    }
    return pa.total_area_acres;
  }

  getTotalAcres() {
    const summary = this.getCurrentSummary();
    return summary.total_area_acres;
  }
}

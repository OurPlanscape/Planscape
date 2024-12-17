import { BehaviorSubject } from 'rxjs';
import {
  DEFAULT_SLOT,
  ImpactsMetric,
  ImpactsMetricSlot,
  METRICS,
} from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { ImpactsProjectArea } from './direct-impacts/direct-impacts.component';
import { PrescriptionAction } from './prescriptions';
import { TreatmentsService } from '@services/treatments.service';
import { Injectable } from '@angular/core';
export interface ChangeOverTimeResult {
  variable: string;
  year: number;
  avg_value: number;
}

@Injectable()
export class DirectImpactsStateService {
  public _activeMetric$ = new BehaviorSubject<ImpactsMetric>({
    metric: METRICS[0],
    slot: DEFAULT_SLOT,
  });

  public activeMetric$ = this._activeMetric$.asObservable();

  private _filteredTreatmentTypes$ = new BehaviorSubject<PrescriptionAction[]>(
    []
  );
  public filteredTreatmentTypes$ = this._filteredTreatmentTypes$.asObservable();
  private _activeStand$ = new BehaviorSubject<MapGeoJSONFeature | null>(null);
  public activeStand$ = this._activeStand$.asObservable();

  private _selectedProjectAreaForChanges$ =
    new BehaviorSubject<ImpactsProjectArea | null>(null);
  public selectedProjectAreaForChanges$ =
    this._selectedProjectAreaForChanges$.asObservable();

  private _availableProjectAreas$ = new BehaviorSubject<
    ImpactsProjectArea[] | null
  >(null);
  public availableProjectAreas$ = this._availableProjectAreas$.asObservable();

  private _changeOverTimeData$ = new BehaviorSubject<ChangeOverTimeResult[][]>([
    [],
  ]);
  public changeOverTimeData$ = this._changeOverTimeData$.asObservable();

  constructor(private treatmentsService: TreatmentsService) {
    //TODO: remove test data
    this._availableProjectAreas$.next([
      { project_area_id: 1, project_area_name: 'Project Area 1' },
      { project_area_id: 2, project_area_name: 'Project Area 2' },
      { project_area_id: 3, project_area_name: 'Project Area 3' },
      { project_area_id: 4, project_area_name: 'Project Area 4' },
      { project_area_id: 5, project_area_name: 'Project Area 5' },
      { project_area_id: 6, project_area_name: 'Project Area 6' },
      { project_area_id: 7, project_area_name: 'Project Area 7' },
      { project_area_id: 8, project_area_name: 'Project Area 8' },
      { project_area_id: 9, project_area_name: 'Project Area 9' },
      { project_area_id: 10, project_area_name: 'Project Area 10' },
    ]);
    //TODO: remove this test data
    this._changeOverTimeData$.next([
      [
        { variable: 'TOTAL_CARBON', year: 0, avg_value: 14.32432 },
        { variable: 'TOTAL_CARBON', year: 5, avg_value: 26.32432 },
        { variable: 'TOTAL_CARBON', year: 10, avg_value: 38.32432 },
        { variable: 'TOTAL_CARBON', year: 15, avg_value: 28.32432 },
        { variable: 'TOTAL_CARBON', year: 20, avg_value: 34.32432 },
      ],
      [
        { variable: 'FL', year: 0, avg_value: 16.32432 },
        { variable: 'FL', year: 5, avg_value: 20.32432 },
        { variable: 'FL', year: 10, avg_value: 31.32432 },
        { variable: 'FL', year: 15, avg_value: 42.32432 },
        { variable: 'FL', year: 20, avg_value: 44.32432 },
      ],
      [
        { variable: 'PTORCH', year: 0, avg_value: 20.32432 },
        { variable: 'PTORCH', year: 5, avg_value: 24.32432 },
        { variable: 'PTORCH', year: 10, avg_value: 36.32432 },
        { variable: 'PTORCH', year: 15, avg_value: 57.32432 },
        { variable: 'PTORCH', year: 20, avg_value: 87.32432 },
      ],
      [
        { variable: 'ROS', year: 0, avg_value: -24.32432 },
        { variable: 'ROS', year: 5, avg_value: -14.32432 },
        { variable: 'ROS', year: 10, avg_value: -4.32432 },
        { variable: 'ROS', year: 15, avg_value: -24.32432 },
        { variable: 'ROS', year: 20, avg_value: -36.32432 },
      ],
    ]);
  }

  getChangesOverTimeData() {
    //TODO: send selectedProjectArea and active Metrics to backend,
    // then collect chart data (and ensure it's sorted by year) to a state variable here

    //TODO: are these selections in a state somewher ealready?
    //TODO: remove this hardcoded example
    const testMetrics = ['PTORCH', 'ROS', 'FL', 'TOTAL_CARBON'];

    this.treatmentsService
      .getTreatmentImpactCharts(169, testMetrics)
      .subscribe({
        next: (response) => {
          console.log('the impacts response?', response);
        },
        error: (error) => {
          //TODO: replace with snackbar or similar
          console.log('error getting impacts: ', error);
        },
      });
  }

  setProjectAreaForChanges(projectArea: ImpactsProjectArea) {
    this._selectedProjectAreaForChanges$.next(projectArea);
    //then refresh the changes chart data

    this.getChangesOverTimeData();
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }

  setFilteredTreatmentTypes(selection: PrescriptionAction[]) {
    this._filteredTreatmentTypes$.next(selection);
  }

  setActiveMetric(mapMetric: ImpactsMetric) {
    this._activeMetric$.next(mapMetric);
  }

  isActiveSlot(slot: ImpactsMetricSlot) {
    return this._activeMetric$.value.slot === slot;
  }
}

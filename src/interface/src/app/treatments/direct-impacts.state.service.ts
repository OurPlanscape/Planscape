import { BehaviorSubject, Observable } from 'rxjs';
import { ImpactsMetric, ImpactsMetricSlot, Metric, METRICS } from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { PrescriptionAction } from './prescriptions';
import { TreatmentProjectArea } from '@types';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DirectImpactsStateService {
  private _reportMetrics$ = new BehaviorSubject<
    Record<ImpactsMetricSlot, Metric>
  >({
    blue: METRICS[0],
    purple: METRICS[1],
    orange: METRICS[2],
    green: METRICS[3],
  });

  public reportMetrics$ = this._reportMetrics$.asObservable();

  private _activeMetric$ = new BehaviorSubject(METRICS[0]);
  public activeMetric$: Observable<Metric> = this._activeMetric$.asObservable();

  private _filteredTreatmentTypes$ = new BehaviorSubject<PrescriptionAction[]>(
    []
  );
  public filteredTreatmentTypes$ = this._filteredTreatmentTypes$.asObservable();
  private _activeStand$ = new BehaviorSubject<MapGeoJSONFeature | null>(null);
  public activeStand$ = this._activeStand$.asObservable();

  private _selectedProjectArea$ = new BehaviorSubject<
    TreatmentProjectArea | 'All'
  >('All');
  public selectedProjectArea$ = this._selectedProjectArea$.asObservable();

  private _standsTxSourceLoaded$ = new BehaviorSubject(false);
  public standsTxSourceLoaded$ = this._standsTxSourceLoaded$.asObservable();

  constructor() {}

  setProjectAreaForChanges(projectArea: TreatmentProjectArea | 'All') {
    this._selectedProjectArea$.next(projectArea);
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }

  setFilteredTreatmentTypes(selection: PrescriptionAction[]) {
    this._filteredTreatmentTypes$.next(selection);
  }

  setActiveMetric(metric: Metric) {
    this._activeMetric$.next(metric);
  }

  updateReportMetric(mapMetric: ImpactsMetric) {
    this._reportMetrics$.next({
      ...this._reportMetrics$.value,
      [mapMetric.slot]: mapMetric.metric,
    });
  }

  setStandsTxSourceLoaded(val: boolean) {
    this._standsTxSourceLoaded$.next(val);
  }

  getFilteredTreatments() {
    return this._filteredTreatmentTypes$.value;
  }
}

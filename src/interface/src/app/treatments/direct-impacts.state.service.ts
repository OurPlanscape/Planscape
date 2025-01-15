import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  switchMap,
} from 'rxjs';
import {
  DEFAULT_SLOT,
  ImpactsMetric,
  ImpactsMetricSlot,
  Metric,
  METRICS,
} from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { PrescriptionAction } from './prescriptions';
import { TreatmentProjectArea } from '../types';

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

  private _activeSlot$ = new BehaviorSubject<ImpactsMetricSlot>(DEFAULT_SLOT);

  public activeMetric$: Observable<ImpactsMetric> = this._activeSlot$.pipe(
    switchMap((slot) =>
      this.reportMetrics$.pipe(
        map((metrics) => ({
          metric: metrics[slot],
          slot: slot,
        }))
      )
    )
  );

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

  private _showTreatmentPrescription$ = new BehaviorSubject(false);
  public showTreatmentPrescription$ =
    this._showTreatmentPrescription$.asObservable();

  private _standsTxSourceLoaded$ = new BehaviorSubject(false);
  public standsTxSourceLoaded$ = this._standsTxSourceLoaded$.asObservable();

  mapPanelTitle$ = combineLatest([
    this.activeMetric$,
    this._selectedProjectArea$,
    this.showTreatmentPrescription$,
  ]).pipe(
    map(([activeMetric, pa, showTreatment]) => {
      let selectedAreaString = '';
      if (pa === 'All') {
        selectedAreaString = 'All Project areas';
      } else {
        selectedAreaString = `${pa.project_area_name}`;
      }
      return showTreatment
        ? 'Applied Treatment Prescription'
        : `${activeMetric.metric.label} for ${selectedAreaString}`;
    })
  );

  constructor() {}

  setProjectAreaForChanges(
    projectArea: TreatmentProjectArea | 'All',
    resetActiveStand = true
  ) {
    this._selectedProjectArea$.next(projectArea);
    if (resetActiveStand) {
      this.resetActiveStand();
    }
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }

  setFilteredTreatmentTypes(selection: PrescriptionAction[]) {
    this._filteredTreatmentTypes$.next(selection);
  }

  setActiveMetric(mapMetric: ImpactsMetric) {
    this._activeSlot$.next(mapMetric.slot);
    this.updateReportMetric(mapMetric);
  }

  updateReportMetric(mapMetric: ImpactsMetric) {
    this._reportMetrics$.next({
      ...this._reportMetrics$.value,
      [mapMetric.slot]: mapMetric.metric,
    });
  }

  isActiveSlot(slot: ImpactsMetricSlot) {
    return this._activeSlot$.value === slot;
  }

  setShowTreatmentPrescription(show: boolean) {
    this._showTreatmentPrescription$.next(show);
  }

  setStandsTxSourceLoaded(val: boolean) {
    this._standsTxSourceLoaded$.next(val);
  }

  resetActiveStand() {
    this._activeStand$.next(null);
  }

  standIsInSelectedProjectArea(projectArea: string) {
    const pa = this._selectedProjectArea$.value;
    if (pa === 'All') {
      return true;
    }
    return pa.project_area_name === projectArea;
  }
}

import { BehaviorSubject, combineLatest, map, of } from 'rxjs';
import {
  DEFAULT_SLOT,
  ImpactsMetric,
  ImpactsMetricSlot,
  METRICS,
} from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { PrescriptionAction } from './prescriptions';

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

  // todo: placeholder to fill once we have project area filter
  projectArea$ = of('All Project Areas');

  private _showTreatmentPrescription$ = new BehaviorSubject(false);
  public showTreatmentPrescription$ =
    this._showTreatmentPrescription$.asObservable();

  mapPanelTitle$ = combineLatest([
    this.activeMetric$,
    this.projectArea$,
    this.showTreatmentPrescription$,
  ]).pipe(
    map(([activeMetric, pa, showTreatment]) =>
      showTreatment
        ? 'Applied Treatment Prescription'
        : `${activeMetric.metric.label} for ${pa}`
    )
  );

  constructor() {}

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

  setShowTreatmentPrescription(show: boolean) {
    this._showTreatmentPrescription$.next(show);
  }
}

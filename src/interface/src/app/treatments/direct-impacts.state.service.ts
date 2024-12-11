import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SLOT, MapMetric, MapMetricSlot, METRICS } from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { PrescriptionAction } from './prescriptions';

export class DirectImpactsStateService {
  public _activeMetric$ = new BehaviorSubject<MapMetric>({
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

  constructor() {}

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }

  setFilteredTreatmentTypes(selection: PrescriptionAction[]) {
    this._filteredTreatmentTypes$.next(selection);
  }

  setActiveMetric(mapMetric: MapMetric) {
    this._activeMetric$.next(mapMetric);
  }

  isActiveSlot(slot: MapMetricSlot) {
    return this._activeMetric$.value.slot === slot;
  }
}

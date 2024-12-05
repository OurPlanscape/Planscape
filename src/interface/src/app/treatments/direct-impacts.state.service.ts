import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SLOT, MapMetric, METRICS } from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { TreatmentProjectArea } from '@types';

@Injectable({
  providedIn: 'root',
})
export class DirectImpactsStateService {
  public activeMetric$ = new BehaviorSubject<MapMetric>({
    metric: METRICS[0],
    slot: DEFAULT_SLOT,
  });

  private _activeStand$ = new BehaviorSubject<MapGeoJSONFeature | null>(null);
  public activeStand$ = this._activeStand$.asObservable();

  private _selectedProjectAreaForChanges$ =
    new BehaviorSubject<TreatmentProjectArea | null>(null);
  public selectedProjectAreaForChanges$ =
    this._selectedProjectAreaForChanges$.asObservable();

  constructor() {}

  getChangesOverTimeData() {
    //TODO: send selectedProjectArea and active Metrics to backend
    //
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }
}

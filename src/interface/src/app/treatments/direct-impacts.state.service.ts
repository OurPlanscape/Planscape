import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { DEFAULT_SLOT, MapMetric, METRICS } from './metrics';
import { MapGeoJSONFeature } from 'maplibre-gl';

@Injectable({
  providedIn: 'root',
})
export class DirectImpactsStateService {
  public activeMetric$ = new BehaviorSubject<MapMetric>({
    metric: METRICS[0],
    slot: DEFAULT_SLOT,
  });

  private _activeStand$ = new Subject<MapGeoJSONFeature>();
  public activeStand$ = this._activeStand$.asObservable();

  constructor() {}

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }
}

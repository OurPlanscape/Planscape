import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

  private _activeStand$ = new BehaviorSubject<MapGeoJSONFeature | null>(null);
  public activeStand$ = this._activeStand$.asObservable();

  private _selectedProjectAreaForChanges$ = new BehaviorSubject<string | null>(
    null
  );
  public selectedProjectAreaForChanges$ =
    this._selectedProjectAreaForChanges$.asObservable();

  constructor() {}

  getChangesOverTimeData() {
    //TODO: send selectedProjectArea and active Metrics to backend
  }

  setProjectAreaForChanges(projectId: string) {
    this._selectedProjectAreaForChanges$.next(projectId);

    //then refresh the changes chart data
    this.getChangesOverTimeData();
  }

  setActiveStand(standData: MapGeoJSONFeature) {
    this._activeStand$.next(standData);
  }
}

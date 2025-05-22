import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';
import { baseLayerStyles } from './map-base-layers';
import { Extent } from '@types';
import { filter } from 'rxjs/operators';
import { BaseLayerType, DEFAULT_BASE_MAP } from '../types/maplibre.map.types';

@Injectable()
export class MapConfigState {
  protected _baseLayer$ = new BehaviorSubject<BaseLayerType>(DEFAULT_BASE_MAP);
  baseLayer$ = this._baseLayer$.asObservable();
  baseLayerUrl$ = this.baseLayer$.pipe(map((b) => baseLayerStyles[b]));

  private _mapExtent$ = new BehaviorSubject<Extent | null>(null);
  mapExtent$ = this._mapExtent$
    .asObservable()
    .pipe(filter((m): m is Extent => !!m));

  private _showProjectAreasLayer$ = new BehaviorSubject(true);
  public showProjectAreasLayer$ = this._showProjectAreasLayer$.asObservable();

  private _standSelectionEnabled$ = new BehaviorSubject(false);
  public standSelectionEnabled$ = this._standSelectionEnabled$.asObservable();

  private _cursor$ = new BehaviorSubject('');
  public cursor$ = this._cursor$.asObservable();

  private _showMapControls$ = new BehaviorSubject(false);
  public showMapControls$ = this._showMapControls$.asObservable();

  private _showTreatmentLegend$ = new BehaviorSubject(false);
  public showTreatmentLegend$ = this._showTreatmentLegend$.asObservable();

  private readonly defaultStandsOpacity = 0.8;
  private _treatedStandsOpacity = new BehaviorSubject(
    this.defaultStandsOpacity
  );
  public treatedStandsOpacity$ = this._treatedStandsOpacity.asObservable();

  private readonly defaultProjectAreasOpacity = 0.5;
  private _projectAreasOpacity = new BehaviorSubject(
    this.defaultProjectAreasOpacity
  );
  public projectAreasOpacity$ = this._projectAreasOpacity.asObservable();

  private defaultZoomLevel = 7;
  public zoomLevel$ = new BehaviorSubject<number>(this.defaultZoomLevel);

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }

  updateMapCenter(pos: any) {
    this._mapExtent$.next(pos);
  }

  updateShowProjectAreas(value: boolean) {
    this._showProjectAreasLayer$.next(value);
  }

  setStandSelectionEnabled(value: boolean) {
    this._standSelectionEnabled$.next(value);
    this.resetCursor();
  }

  isStandSelectionEnabled() {
    return this._standSelectionEnabled$.value;
  }

  setCursor(value: string) {
    this._cursor$.next(value);
  }

  resetCursor() {
    this._cursor$.next(this._standSelectionEnabled$.value ? 'crosshair' : '');
  }

  setShowMapControls(value: boolean) {
    this._showMapControls$.next(value);
  }

  setTreatmentLegendVisible(value: boolean) {
    this._showTreatmentLegend$.next(value);
  }

  setTreatedStandsOpacity(value: number) {
    this._treatedStandsOpacity.next(value);
  }

  setProjectAreasOpacity(value: number) {
    this._projectAreasOpacity.next(value);
  }
}

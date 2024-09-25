import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';
import {
  baseLayerStyles,
  BaseLayerType,
  DEFAULT_BASE_MAP,
} from './map-base-layers';
import { Extent } from '@types';
import { filter } from 'rxjs/operators';

@Injectable()
export class MapConfigState {
  private _baseLayer$ = new BehaviorSubject<BaseLayerType>(DEFAULT_BASE_MAP);
  baseLayer$ = this._baseLayer$.asObservable();
  baseLayerUrl$ = this.baseLayer$.pipe(map((b) => baseLayerStyles[b]));

  private _mapExtent$ = new BehaviorSubject<Extent | null>(null);
  mapExtent$ = this._mapExtent$
    .asObservable()
    .pipe(filter((m): m is Extent => !!m));

  private _showProjectAreasLayer$ = new BehaviorSubject(true);
  public showProjectAreasLayer$ = this._showProjectAreasLayer$.asObservable();

  private _showTreatmentStandsLayer$ = new BehaviorSubject(true);
  public showTreatmentStandsLayer$ =
    this._showTreatmentStandsLayer$.asObservable();

  private _standSelectionEnabled$ = new BehaviorSubject(false);
  public standSelectionEnabled$ = this._standSelectionEnabled$.asObservable();

  private _cursor$ = new BehaviorSubject('');
  public cursor$ = this._cursor$.asObservable();

  private _showMapControls$ = new BehaviorSubject(false);
  public showMapControls$ = this._showMapControls$.asObservable();

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }

  updateMapCenter(pos: any) {
    this._mapExtent$.next(pos);
  }

  updateShowProjectAreas(value: boolean) {
    this._showProjectAreasLayer$.next(value);
  }

  updateShowTreatmentStands(value: boolean) {
    this._showTreatmentStandsLayer$.next(value);
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
}

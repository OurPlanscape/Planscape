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

  private _mapCenter$ = new BehaviorSubject<Extent | null>(null);
  mapCenter$ = this._mapCenter$
    .asObservable()
    .pipe(filter((m): m is Extent => !!m));

  private _showProjectAreasLayer$ = new BehaviorSubject(true);
  public showProjectAreasLayer$ = this._showProjectAreasLayer$.asObservable();

  private _showTreatmentStandsLayer$ = new BehaviorSubject(true);
  public showTreatmentStandsLayer$ =
    this._showTreatmentStandsLayer$.asObservable();

  private _boxSelectionEnabled$ = new BehaviorSubject(false);
  public boxSelectionEnabled$ = this._boxSelectionEnabled$.asObservable();

  private _cursor$ = new BehaviorSubject('');
  public cursor$ = this._cursor$.asObservable();

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }

  updateMapCenter(pos: any) {
    this._mapCenter$.next(pos);
  }

  updateShowProjectAreas(value: boolean) {
    this._showProjectAreasLayer$.next(value);
  }

  updateShowTreatmentStands(value: boolean) {
    this._showTreatmentStandsLayer$.next(value);
  }

  toggleShowTreatmentStands() {
    const value = this._showTreatmentStandsLayer$.value;
    this._showTreatmentStandsLayer$.next(!value);
  }

  toggleBoxSelectionEnabled() {
    const value = this._boxSelectionEnabled$.value;
    this._boxSelectionEnabled$.next(!value);
    this.resetCursor();
  }

  getBoxSelectionEnabled() {
    return this._boxSelectionEnabled$.value;
  }

  setCursor(value: string) {
    this._cursor$.next(value);
  }

  resetCursor() {
    this._cursor$.next(this._boxSelectionEnabled$.value ? 'crosshair' : '');
  }
}

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

  private _showTreatmentStandsLayer$ = new BehaviorSubject(false);
  public showTreatmentStandsLayer$ =
    this._showTreatmentStandsLayer$.asObservable();

  private _showFillProjectAreas$ = new BehaviorSubject(true);
  public showFillProjectAreas$ = this._showFillProjectAreas$.asObservable();

  private _standSelectionEnabled$ = new BehaviorSubject(false);
  public standSelectionEnabled$ = this._standSelectionEnabled$.asObservable();

  private _cursor$ = new BehaviorSubject('');
  public cursor$ = this._cursor$.asObservable();

  private _showMapControls$ = new BehaviorSubject(false);
  public showMapControls$ = this._showMapControls$.asObservable();

  private readonly defaultOpacity = 0.8;
  private _treatedStandsOpacity = new BehaviorSubject(this.defaultOpacity);
  public treatedStandsOpacity$ = this._treatedStandsOpacity.asObservable();

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

  updateShowTreatmentStands(value: boolean) {
    this.setTreatedStandsOpacity(this.defaultOpacity);
    this._showTreatmentStandsLayer$.next(value);
  }

  setShowFillProjectAreas(value: boolean) {
    this._showFillProjectAreas$.next(value);
  }

  toggleShowTreatmentStands() {
    const treatmentsVisible = this.isTreatmentStandsVisible();

    this.setShowFillProjectAreas(treatmentsVisible);
    this.setTreatedStandsOpacity(treatmentsVisible ? 0 : 1);
    this._showTreatmentStandsLayer$.next(!treatmentsVisible);
  }

  isTreatmentStandsVisible() {
    return this._showTreatmentStandsLayer$.value;
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

  setTreatedStandsOpacity(value: number) {
    this._treatedStandsOpacity.next(value);
  }
}

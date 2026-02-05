import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';
import { baseMapStyles } from './map-base-layers';
import { Extent } from '@types';
import { filter } from 'rxjs/operators';
import { BaseMapType, DEFAULT_BASE_MAP } from '@types';
import { FrontendConstants } from '@map/map.constants';

export type MapInteractionMode = 'draw' | 'view' | 'upload';

@Injectable()
export class MapConfigState {
  protected _baseMap$ = new BehaviorSubject<BaseMapType>(DEFAULT_BASE_MAP);
  baseMap$ = this._baseMap$.asObservable();
  baseMapUrl$ = this.baseMap$.pipe(map((b) => baseMapStyles[b]));

  // Data layers opacity, it will be common for all maps
  private _dataLayersOpacity$ = new BehaviorSubject<number>(
    FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY
  );
  public dataLayersOpacity$ = this._dataLayersOpacity$.asObservable();

  protected _mapExtent$ = new BehaviorSubject<Extent | null>(null);
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

  private _opacity = new BehaviorSubject<number>(
    FrontendConstants.MAPLIBRE_MAP_VECTOR_LAYER_OPACITY
  );
  public opacity$ = this._opacity.asObservable();

  private defaultZoomLevel = 7;
  public zoomLevel$ = new BehaviorSubject<number>(this.defaultZoomLevel);

  private _mapInteractionMode$ = new BehaviorSubject<MapInteractionMode>(
    'view'
  );
  public mapInteractionMode$ = this._mapInteractionMode$.asObservable();

  updateBaseMap(layer: BaseMapType) {
    this._baseMap$.next(layer);
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

  setOpacity(value: number) {
    this._opacity.next(value);
  }

  enterDrawingMode() {
    this._mapInteractionMode$.next('draw');
  }

  enterUploadMode() {
    this._mapInteractionMode$.next('upload');
  }

  enterViewMode() {
    this._mapInteractionMode$.next('view');
  }

  updateDataLayersOpacity(opacity: number) {
    this._dataLayersOpacity$.next(opacity);
  }
}

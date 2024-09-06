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

  private _showProjectAreas$ = new BehaviorSubject(true);
  public showProjectAreas$ = this._showProjectAreas$.asObservable();

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }

  updateMapCenter(pos: any) {
    this._mapCenter$.next(pos);
  }

  updateShowProjectAreas(value: boolean) {
    this._showProjectAreas$.next(value);
  }
}

import { Injectable } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { BehaviorSubject } from 'rxjs';
import {
  LngLat,
  LngLatBounds,
  Map as MapLibreMap,
  StyleSpecification,
} from 'maplibre-gl';

export interface MapViewSnapshot {
  style: StyleSpecification;
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds: LngLatBounds;
}

@Injectable()
export class FundingMapConfigState extends MapConfigState {
  private _selectedProjectAreas$ = new BehaviorSubject<number[]>([]);
  public selectedProjectAreas$ = this._selectedProjectAreas$.asObservable();

  private _mapLoaded$ = new BehaviorSubject<boolean>(false);
  public mapLoaded$ = this._mapLoaded$.asObservable();

  private _showFundingLegend$ = new BehaviorSubject(true);
  public showFundingLegend$ = this._showFundingLegend$.asObservable();

  //TODO: just a PoC
  private _mapRef$ = new BehaviorSubject<MapLibreMap | null>(null);

  setMapRef(mapRef: MapLibreMap) {
    this._mapRef$.next(mapRef);
  }

  getViewSnapshot(): MapViewSnapshot | null {
    const map = this._mapRef$.value;
    if (!map) return null;

    return {
      style: map.getStyle(),
      center: map.getBounds().getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      bounds: map.getBounds(),
    };
  }

  setMapLoaded(loaded: boolean) {
    this._mapLoaded$.next(loaded);
  }

  setFundingLegendVisibility(value: boolean) {
    this._showFundingLegend$.next(value);
  }

  updateSelectedProjectAreas(ids: number[]) {
    this._selectedProjectAreas$.next(ids);
  }

  toggleSelectedProjectArea(id: any) {
    const currentSelection = this._selectedProjectAreas$.getValue();
    // if the id is already selected, we remove it.

    if (currentSelection.includes(id)) {
      this._selectedProjectAreas$.next(
        currentSelection.filter((p) => p !== id)
      );
    } else {
      // otherwise we add it

      this._selectedProjectAreas$.next([...currentSelection, id]);
    }
  }
}

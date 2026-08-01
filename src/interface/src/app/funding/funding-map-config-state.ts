import { Injectable } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { BehaviorSubject } from 'rxjs';
import { Map as MapLibreMap } from 'maplibre-gl';
@Injectable()
export class FundingMapConfigState extends MapConfigState {
  private _selectedProjectAreas$ = new BehaviorSubject<number[]>([]);
  public selectedProjectAreas$ = this._selectedProjectAreas$.asObservable();

  private _mapLoaded$ = new BehaviorSubject<boolean>(false);
  public mapLoaded$ = this._mapLoaded$.asObservable();

  private _showFundingLegend$ = new BehaviorSubject(true);
  public showFundingLegend$ = this._showFundingLegend$.asObservable();

  // TODO: just a proof-of-concept here....
  private legendData : any = null;


  //TODO: just a PoC, dont do it like this
  private _mapRef$ = new BehaviorSubject<MapLibreMap | null>(null);
  public mapRef$ = this._mapRef$.asObservable();

  setMapRef(mapRef: MapLibreMap) {
    this._mapRef$.next(mapRef);
  }

  getMapRef() {
    return this._mapRef$.value;
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

  setLegendData(legendData : any) {
    this.legendData = legendData;
  }

  getLegendData() {
    return this.legendData;
  }

  getCurrentSelectedAreas() {
    return this._selectedProjectAreas$.value;
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

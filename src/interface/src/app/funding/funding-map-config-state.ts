import { Injectable } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class FundingMapConfigState extends MapConfigState {
  private _selectedProjectAreas$ = new BehaviorSubject<number[]>([]);
  public selectedProjectAreas$ = this._selectedProjectAreas$.asObservable();

  private _mapLoading$ = new BehaviorSubject<boolean>(false);
  public mapLoading$ = this._mapLoading$.asObservable();

  private _showFundingLegend$ = new BehaviorSubject(false);
  public showFundingLegend$ = this._showFundingLegend$.asObservable();

  isMapLoading(loaded: boolean) {
    this._mapLoading$.next(loaded);
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

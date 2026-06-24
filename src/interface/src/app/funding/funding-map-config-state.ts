import { Injectable } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class FundingMapConfigState extends MapConfigState {
  private _selectedProjectAreas$ = new BehaviorSubject<number[]>([]);
  public selectedProjectAreas$ = this._selectedProjectAreas$.asObservable();

  private _showFundingLegend$ = new BehaviorSubject(false);
  public showFundingLegend$ = this._showFundingLegend$.asObservable();

  setFundingLegendVisible(value: boolean) {
    this._showFundingLegend$.next(value);
  }

  /**  note that 'ids' here is either based on:
  /*  the project_id for USER origin or the rank for SYSTEM origin
  */
  updateSelectedProjectAreas(ids: number[]) {
    this._selectedProjectAreas$.next(ids);
  }

  /**  note that 'id' here is either based on:
  /*  the project_id for USER origin or the rank for SYSTEM origin
  */
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

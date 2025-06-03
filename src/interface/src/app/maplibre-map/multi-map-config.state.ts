import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from './map-config.state';
import { MultiMapsStorageService } from '@services/local-storage.service';
import { FrontendConstants } from '../map/map.constants';
import { Extent } from '@types';

export type LayoutOption = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _layoutMode$ = new BehaviorSubject<LayoutOption>(1);
  public layoutMode$ = this._layoutMode$.asObservable();

  private _selectedMapId$ = new BehaviorSubject<number>(1);
  public selectedMapId$ = this._selectedMapId$.asObservable();

  constructor(private multiMapsStorageService: MultiMapsStorageService) {
    super();
    this._mapExtent$.next(FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS);
  }

  setLayoutMode(views: LayoutOption) {
    if (views < this._selectedMapId$.value) {
      this.setSelectedMap(1);
    }
    this._layoutMode$.next(views);
  }

  /** Saves:
   * The current map zoom and position
   * The current base map layer style (satellite/road/terrain)
   * The number of visible maps
   */
  saveStateToLocalStorage(extent: Extent) {
    const options = {
      layoutMode: this._layoutMode$.value,
      baseLayer: this._baseLayer$.value,
      extent: extent,
    };
    this.multiMapsStorageService.setItem(options);
  }

  loadStateFromLocalStorage() {
    const options = this.multiMapsStorageService.getItem();
    if (options) {
      this._layoutMode$.next(options.layoutMode);
      this._baseLayer$.next(options.baseLayer);
      this._mapExtent$.next(options.extent);
    }
  }

  setSelectedMap(id: number) {
    this._selectedMapId$.next(id);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from './map-config.state';
import { ExploreOptionsStorageService } from '@services/local-storage.service';
import { FrontendConstants } from '../map/map.constants';
import { LngLatBoundsLike } from 'maplibre-gl';

type LayoutOption = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _layoutMode$ = new BehaviorSubject<LayoutOption>(1);
  public layoutMode$ = this._layoutMode$.asObservable();

  constructor(
    private exploreOptionsStorageService: ExploreOptionsStorageService
  ) {
    super();
    this._mapExtent$.next(FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS);
  }

  setLayoutMode(views: LayoutOption) {
    this._layoutMode$.next(views);
  }

  /** Saves:
   * The current map zoom and position
   * The current base map layer style (satellite/road/terrain)
   * The number of visible maps
   */
  saveStateToLocalStorage(bounds: LngLatBoundsLike) {
    const options = {
      layoutMode: this._layoutMode$.value,
      baseLayer: this._baseLayer$.value,
      bounds: bounds as [number, number, number, number],
    };
    this.exploreOptionsStorageService.setItem(options);
  }

  loadStateFromLocalStorage() {
    const options = this.exploreOptionsStorageService.getItem();
    if (options) {
      this._layoutMode$.next(options.layoutMode);
      this._baseLayer$.next(options.baseLayer);
      this._mapExtent$.next(options.bounds);
    }
  }
}

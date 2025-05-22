import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from './map-config.state';
import { ExploreOptionsStorageService } from '@services/local-storage.service';

type layoutOption = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _layoutMode$ = new BehaviorSubject<layoutOption>(1);
  public layoutMode$ = this._layoutMode$.asObservable();

  constructor(
    private exploreOptionsStorageService: ExploreOptionsStorageService
  ) {
    super();
  }

  setLayoutMode(views: layoutOption) {
    this._layoutMode$.next(views);
  }

  saveStateToLocalStorage(extent: any) {
    /**
     * The current map zoom and position
     * The current base map layer style (satellite/road/terrain)
     * The number of visible maps
     */
    const options = {
      layoutMode: this._layoutMode$.value,
      baseMap: this._baseLayer$.value,
      extent: extent,
    };
    this.exploreOptionsStorageService.setItem(options);
  }

  loadStateFromLocalStorage() {
    const options = this.exploreOptionsStorageService.getItem();
    if (options) {
      this._layoutMode$.next(options);
    }
  }
}

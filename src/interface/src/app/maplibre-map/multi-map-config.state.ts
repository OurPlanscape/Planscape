import { Injectable } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';
import { MapConfigState } from './map-config.state';
import { MultiMapsStorageService } from '@services/local-storage.service';
import { FrontendConstants, MAP_WEST_CONUS_BOUNDS } from '../map/map.constants';
import { Extent } from '@types';
import { BaseLayersStateService } from '../base-layers/base-layers.state.service';
import { FeatureService } from '../features/feature.service';

export type LayoutOption = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _layoutMode$ = new BehaviorSubject<LayoutOption>(1);
  public layoutMode$ = this._layoutMode$.asObservable();

  private _selectedMapId$ = new BehaviorSubject<number | null>(1);
  public selectedMapId$ = this._selectedMapId$.asObservable();

  constructor(
    private multiMapsStorageService: MultiMapsStorageService,
    private baseLayersStateService: BaseLayersStateService,
    private featureService: FeatureService
  ) {
    super();
    if (this.featureService.isFeatureEnabled('CONUS_WIDE_SCENARIOS')) {
      this._mapExtent$.next(MAP_WEST_CONUS_BOUNDS);
    } else {
      this._mapExtent$.next(FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS);
    }
  }

  setLayoutMode(views: LayoutOption) {
    const selectedMapId = this._selectedMapId$.value;
    if (!selectedMapId || views < selectedMapId) {
      this.setSelectedMap(!selectedMapId ? selectedMapId : 1);
    }
    this._layoutMode$.next(views);
  }

  /** Saves:
   * The current map zoom and position
   * The current base map layer style (satellite/road/terrain)
   * The number of visible maps
   */
  saveStateToLocalStorage(extent: Extent) {
    this.baseLayersStateService.selectedBaseLayers$
      .pipe(take(1))
      .subscribe((baseLayers) => {
        const existingStorage = this.multiMapsStorageService.getItem();
        this.multiMapsStorageService.setItem({
          ...existingStorage,
          layoutMode: this._layoutMode$.value,
          baseMap: this._baseMap$.value,
          extent: extent,
          baseLayers: baseLayers,
          selectedMapId: this._selectedMapId$.value,
        });
      });
  }

  loadStateFromLocalStorage() {
    const options = this.multiMapsStorageService.getItem();
    if (options?.layoutMode) {
      this._layoutMode$.next(options.layoutMode);
    }
    if (options?.baseMap) {
      this._baseMap$.next(options.baseMap);
    }
    if (options?.extent) {
      this._mapExtent$.next(options.extent);
    }
    if (options?.baseLayers) {
      this.baseLayersStateService.setBaseLayers(options.baseLayers);
    }
    if (options?.selectedMapId !== undefined) {
      this._selectedMapId$.next(options.selectedMapId);
    }
  }

  setSelectedMap(id: number | null) {
    this._selectedMapId$.next(id);
  }

  resetToFirstMap() {
    if (this._selectedMapId$.value === null) {
      this._selectedMapId$.next(1);
    }
  }
}

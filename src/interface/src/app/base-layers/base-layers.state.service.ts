import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
} from 'rxjs';
import { DataLayersService } from '@services/data-layers.service';
import { BaseLayer } from '@types';

@Injectable({
  providedIn: 'root',
})
export class BaseLayersStateService {
  constructor(private dataLayersService: DataLayersService) {}

  // gets all base layers
  baseLayers$ = this.dataLayersService.listBaseLayers().pipe(shareReplay(1));

  private _loadingLayers$ = new BehaviorSubject<string[]>([]);
  public loadingLayers$ = this._loadingLayers$
    .asObservable()
    .pipe(distinctUntilChanged());

  // base layers grouped by category (one level)
  categorizedBaseLayers$ = this.baseLayers$.pipe(
    filter((layers) =>
      layers.some((layer) => layer.path.length === 1 && layer.path[0])
    ),
    map((layers) => {
      const grouped = layers.reduce<Record<string, BaseLayer[]>>(
        (acc, layer) => {
          const category = layer.path[0];
          (acc[category] ??= []).push(layer);
          return acc;
        },
        {}
      );

      return Object.entries(grouped).map(([categoryName, categoryLayers]) => ({
        category: {
          name: categoryName,
          isMultiSelect: this.isCategoryMultiSelect(categoryName),
        },
        layers: [...categoryLayers].sort((a, b) => {
          // push any “order = -1” item to the very end:
          const aOrder = a.metadata?.modules?.toc?.order;
          const bOrder = b.metadata?.modules?.toc?.order;

          if (aOrder === -1 && bOrder !== -1) return 1;
          if (bOrder === -1 && aOrder !== -1) return -1;
          // otherwise, alphabetical
          return a.name.localeCompare(b.name);
        }),
      }));
    })
  );

  private _enableBaseLayerHover$ = new BehaviorSubject<boolean>(true);
  enableBaseLayerHover$ = this._enableBaseLayerHover$.asObservable();

  private _selectedBaseLayers$ = new BehaviorSubject<BaseLayer[] | null>(null);
  selectedBaseLayers$ = this._selectedBaseLayers$.asObservable();

  updateBaseLayers(bl: BaseLayer, isMulti: boolean) {
    const currentLayers = this._selectedBaseLayers$.value ?? [];

    // If no layers selected, just set the new one
    if (currentLayers.length === 0) {
      this._selectedBaseLayers$.next([bl]);
      this.addLoadingSourceId('source_' + bl.id);
      return;
    }

    const currentCategory = currentLayers[0].path[0];

    // if the layer allows multi select
    if (isMulti) {
      if (bl.path[0] === currentCategory) {
        const alreadySelected = currentLayers.some(
          (layer) => layer.id === bl.id
        );
        if (alreadySelected) {
          // Remove if already selected
          const updated = currentLayers.filter((layer) => layer.id !== bl.id);
          // If it's already selected and it's checkbox we want to remove loading
          this.removeLoadingSourceId('source_' + bl.id);
          this._selectedBaseLayers$.next(updated);
        } else {
          // Add if not already selected
          this.addLoadingSourceId('source_' + bl.id);
          this._selectedBaseLayers$.next([...currentLayers, bl]);
        }
      } else {
        // Different category, start new selection
        this.resetSourceIds();
        this.addLoadingSourceId('source_' + bl.id);
        this._selectedBaseLayers$.next([bl]);
      }
    } else {
      // Replace with only this layer regardless of current state
      this.resetSourceIds();
      this.addLoadingSourceId('source_' + bl.id);
      this._selectedBaseLayers$.next([bl]);
    }
  }

  clearBaseLayer() {
    this._selectedBaseLayers$.next(null);
  }

  enableBaseLayerHover(value: boolean) {
    this._enableBaseLayerHover$.next(value);
  }

  addLoadingSourceId(id: string) {
    this._loadingLayers$.next([...this._loadingLayers$.value, id]);
  }

  removeLoadingSourceId(id: string) {
    let currentValues = this._loadingLayers$.value.filter((l) => l !== id);
    this._loadingLayers$.next([...currentValues]);
  }

  resetSourceIds() {
    this._loadingLayers$.next([]);
  }

  setBaseLayers(baseLayers: BaseLayer[]) {
    this._selectedBaseLayers$.next(baseLayers);
  }

  // also sets loading for base layers where category is irrelevant
  updateAllBaseLayers(baseLayers: BaseLayer[]) {
    const currentLayers = this._selectedBaseLayers$.value ?? [];
    const newLayers = baseLayers.filter(myLayer => 
      !currentLayers.some(existingLayer => existingLayer.id === myLayer.id)
    );
    newLayers.map(ne => this.addLoadingSourceId(`source_${ne.id}` ));
    this._selectedBaseLayers$.next(baseLayers);
  }

  private isCategoryMultiSelect(path: string) {
    return path == 'Ownership';
  }
}

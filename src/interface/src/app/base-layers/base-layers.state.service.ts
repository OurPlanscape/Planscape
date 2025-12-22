import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { BaseLayer } from '@types';

@Injectable({
  providedIn: 'root',
})
export class BaseLayersStateService {
  constructor() {}

  private _loadingLayers$ = new BehaviorSubject<string[]>([]);
  public loadingLayers$ = this._loadingLayers$
    .asObservable()
    .pipe(distinctUntilChanged());

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

  // This updates all base layers given regardless of category, (e.g., in a flat list),
  // where separate categories may exist on the layer, but are irrelevant.
  // This also sets loading sourceid for newly added layers
  updateFlatMultiBaseLayers(updatedLayers: BaseLayer[]): void {
    const displayedLayers = this._selectedBaseLayers$.value;
    const loadingLayers = this._loadingLayers$.value;
    const sourceIds = new Set(
      updatedLayers.map((layer) => `source_${layer.id}`)
    ); // cache the string conversions

    // add layers to loading if currently in displayed list
    updatedLayers
      .filter(
        (updatedLayer) =>
          !displayedLayers?.map((cl) => cl.id).includes(updatedLayer.id)
      )
      .forEach((updatedLayer) =>
        this.addLoadingSourceId(`source_${updatedLayer.id}`)
      );

    // remove loading layers if not in the current updatedLayers
    loadingLayers
      .filter((loadingLayerId) => !sourceIds.has(loadingLayerId))
      .forEach((loadingLayerId) => this.removeLoadingSourceId(loadingLayerId));
    this._selectedBaseLayers$.next(updatedLayers);
  }
}

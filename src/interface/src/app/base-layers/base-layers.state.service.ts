import { Injectable } from '@angular/core';
import { BehaviorSubject, map, shareReplay } from 'rxjs';
import { DataLayersService } from '@services/data-layers.service';
import { BaseLayer, CategorizedBaseLayers } from '@types';

@Injectable({
  providedIn: 'root',
})
export class BaseLayersStateService {
  constructor(private dataLayersService: DataLayersService) {}

  // gets all base layers
  baseLayers$ = this.dataLayersService.listBaseLayers().pipe(shareReplay(1));

  // base layers grouped by category (one level)
  categorizedBaseLayers$ = this.baseLayers$.pipe(
    map((layers) => {
      const grouped = layers.reduce<Record<string, BaseLayer[]>>(
        (acc, layer) => {
          const category = layer.path[0];
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(layer);
          return acc;
        },
        {}
      );

      const result: CategorizedBaseLayers[] = Object.entries(grouped).map(
        ([categoryName, categoryLayers]) => {
          const isMulti = this.isCategoryMultiSelect(categoryName);
          return {
            category: {
              name: categoryName,
              isMultiSelect: isMulti,
            },
            layers: categoryLayers,
          };
        }
      );

      return result;
    })
  );

  private _selectedBaseLayers$ = new BehaviorSubject<BaseLayer[] | null>(null);
  selectedBaseLayers$ = this._selectedBaseLayers$.asObservable();

  updateBaseLayers(bl: BaseLayer, isMulti: boolean) {
    const currentLayers = this._selectedBaseLayers$.value ?? [];

    // If no layers selected, just set the new one
    if (currentLayers.length === 0) {
      this._selectedBaseLayers$.next([bl]);
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
          this._selectedBaseLayers$.next(updated);
        } else {
          // Add if not already selected
          this._selectedBaseLayers$.next([...currentLayers, bl]);
        }
      } else {
        // Different category, start new selection
        this._selectedBaseLayers$.next([bl]);
      }
    } else {
      // Replace with only this layer regardless of current state
      this._selectedBaseLayers$.next([bl]);
    }
  }

  clearBaseLayer() {
    this._selectedBaseLayers$.next(null);
  }

  private isCategoryMultiSelect(path: string) {
    return path == 'Ownership';
  }
}

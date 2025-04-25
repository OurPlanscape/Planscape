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
          const isMulti = categoryName === 'Organization';
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

  private _selectedBaseLayer$ = new BehaviorSubject<BaseLayer[] | null>(null);
  selectedBaseLayer$ = this._selectedBaseLayer$.asObservable();

  selectBaseLayer(bl: BaseLayer, isMulti: boolean) {
    const current = this._selectedBaseLayer$.value ?? [];

    // If no layers selected, just set the new one
    if (current.length === 0) {
      this._selectedBaseLayer$.next([bl]);
      return;
    }

    const currentCategory = current[0].path[0];

    // if the layer allows multi select
    if (isMulti) {
      if (bl.path[0] === currentCategory) {
        // Add only if not already selected
        const alreadySelected = current.some((layer) => layer.id === bl.id);
        if (!alreadySelected) {
          this._selectedBaseLayer$.next([...current, bl]);
        }
      } else {
        // Different category, start new selection
        this._selectedBaseLayer$.next([bl]);
      }
    } else {
      // Replace with only this layer regardless of current state
      this._selectedBaseLayer$.next([bl]);
    }
  }

  clearBaseLayer() {
    this._selectedBaseLayer$.next(null);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface BaseLayer {
  id: number;
  name: string;
  category: string;
  multi: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BaseLayersStateService {
  constructor() {}

  private _selectedBaseLayer$ = new BehaviorSubject<BaseLayer[] | null>(null);
  selectedBaseLayer$ = this._selectedBaseLayer$.asObservable();

  selectBaseLayer(bl: BaseLayer) {
    const current = this._selectedBaseLayer$.value ?? [];

    // If no layers selected, just set the new one
    if (current.length === 0) {
      this._selectedBaseLayer$.next([bl]);
      return;
    }

    const currentCategory = current[0].category;

    if (bl.multi) {
      if (bl.category === currentCategory) {
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

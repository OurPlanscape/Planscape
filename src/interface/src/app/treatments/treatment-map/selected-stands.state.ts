import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

/**
 * Manages the selected stands on a map
 */
@Injectable()
export class SelectedStandsState {
  private _selectedStands$ = new BehaviorSubject<number[]>([]);
  selectedStands$ = this._selectedStands$.asObservable();

  updateSelectedStands(stands: number[]) {
    this._selectedStands$.next(stands);
  }

  clearStands() {
    this._selectedStands$.next([]);
  }

  getSelectedStands() {
    return this._selectedStands$.value;
  }

  toggleStand(id: number) {
    const selectedStands = this.getSelectedStands();
    const selectedStand = selectedStands.find((standId) => standId === id);
    if (selectedStand) {
      this.updateSelectedStands(
        selectedStands.filter((selectedStandId) => selectedStandId !== id)
      );
    } else {
      this.updateSelectedStands([...selectedStands, id]);
    }
  }
}

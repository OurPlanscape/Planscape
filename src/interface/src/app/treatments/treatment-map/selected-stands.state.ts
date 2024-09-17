import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

/**
 * Manages the selected stands on a map
 */
@Injectable()
export class SelectedStandsState {
  private _selectedStands$ = new BehaviorSubject<number[]>([]);
  selectedStands$ = this._selectedStands$.asObservable();
  private _history: number[][] = [];

  updateSelectedStands(stands: number[]) {
    this._selectedStands$.next(stands);
  }

  clearStands() {
    this._history.push(this.getSelectedStands());
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

  undo() {
    // If there is history available, restore the last state
    if (this._history.length > 0) {
      const lastState = this._history.pop();
      if (lastState) {
        this._selectedStands$.next(lastState);
      } else {
        this._selectedStands$.next([]);
      }
    }
  }

  saveHistory(stands: number[]) {
    if (this._selectedStands$.value != stands) {
      this._history.push(stands);
    }
  }

  reset() {
    this._history = [];
    this._selectedStands$.next([]);
  }
}

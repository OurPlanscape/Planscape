import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapStandsService {
  selectedStands$ = new BehaviorSubject<number[]>([]);

  updateSelectedStands(stands: number[]) {
    this.selectedStands$.next(stands);
  }

  clearStands() {
    this.selectedStands$.next([]);
  }

  toggleStand(id: number) {
    const selectedStands = this.selectedStands$.value;
    const selectedStand = selectedStands.find((standId) => standId === id);
    if (selectedStand) {
      this.updateSelectedStands(
        selectedStands.filter((selectedStandId) => selectedStandId !== id)
      );
    } else {
      this.updateSelectedStands([...selectedStands, id]);
    }
  }

  constructor() {}
}

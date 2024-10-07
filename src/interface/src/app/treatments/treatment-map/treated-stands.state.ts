import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

import { TreatedStand } from '@types';

/**
 * Manages the stands that have treatment, to be displayed on the map.
 */
@Injectable()
export class TreatedStandsState {
  private _treatedStands$ = new BehaviorSubject<TreatedStand[]>([]);
  treatedStands$ = this._treatedStands$.asObservable();
  private _opacity$ = new BehaviorSubject(0.5);
  public opacity$ = this._opacity$.asObservable();

  updateTreatedStands(stands: TreatedStand[]) {
    const currentStands = this.getTreatedStands();

    // Remove any existing stands with the same IDs as the new ones
    const filteredStands = currentStands.filter(
      (currentStand) => !stands.some((stand) => stand.id === currentStand.id)
    );

    const updatedStands = [...filteredStands, ...stands];
    this._treatedStands$.next(updatedStands);
  }

  setTreatedStands(stands: TreatedStand[]) {
    this._treatedStands$.next(stands);
  }

  getTreatedStands() {
    return this._treatedStands$.value;
  }

  removeTreatments(standId: number[]) {
    const currentStands = this.getTreatedStands();
    const filteredStands = currentStands.filter(
      (currentStand) => !standId.some((standId) => standId === currentStand.id)
    );
    this._treatedStands$.next(filteredStands);
  }

  setOpacity(value: number) {
    this._opacity$.next(value);
  }
}

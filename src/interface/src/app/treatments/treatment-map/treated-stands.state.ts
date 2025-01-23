import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';

import { TreatedStand } from '@types';
import { PrescriptionAction, SEQUENCE_ACTIONS } from '../prescriptions';

/**
 * Manages the stands that have treatment, to be displayed on the map.
 */
@Injectable()
export class TreatedStandsState {
  private _treatedStands$ = new BehaviorSubject<TreatedStand[]>([]);
  treatedStands$ = this._treatedStands$.asObservable();

  sequenceStandsIds$ = this.treatedStands$.pipe(
    map((stands) =>
      stands
        .filter((stand) => stand.action in SEQUENCE_ACTIONS)
        .map((stand) => stand.id)
    )
  );

  treatmentActionsUsed$ = this.treatedStands$.pipe(
    map((stands) => [
      ...new Set(stands.map((s) => s.action as PrescriptionAction)),
    ])
  );

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
}

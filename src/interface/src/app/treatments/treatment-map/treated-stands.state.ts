import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { TreatedStand } from '@services/treatments.service';

@Injectable()
export class TreatedStandsState {
  private _treatedStands$ = new BehaviorSubject<TreatedStand[]>([]);
  treatedStands$ = this._treatedStands$.asObservable();

  updateTreatedStands(stands: TreatedStand[]) {
    const treatedStands = [...this.getTreatedStands(), ...stands];
    console.log(treatedStands);
    this._treatedStands$.next(treatedStands);
  }

  getTreatedStands() {
    return this._treatedStands$.value;
  }
}

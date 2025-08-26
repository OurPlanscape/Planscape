import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScenarioMapService {
  private _loading$ = new BehaviorSubject(false);
  public loading$ = this._loading$.asObservable();

  constructor() {}

  setLoading(isLoading: boolean) {
    this._loading$.next(isLoading);
  }
}

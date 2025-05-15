import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from './map-config.state';

type AvailableViews = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _views$ = new BehaviorSubject<AvailableViews>(1);
  public views$ = this._views$.asObservable();

  setViews(views: AvailableViews) {
    this._views$.next(views);
  }
}

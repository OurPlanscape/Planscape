import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from './map-config.state';

type layoutOption = 1 | 2 | 4;

@Injectable()
export class MultiMapConfigState extends MapConfigState {
  // adds additional logic and config for multi map view.
  private _layoutMode$ = new BehaviorSubject<layoutOption>(1);
  public layoutMode$ = this._layoutMode$.asObservable();

  setLayoutMode(views: layoutOption) {
    this._layoutMode$.next(views);
  }
}

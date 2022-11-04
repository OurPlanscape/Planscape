import { BehaviorSubject } from 'rxjs';
import { Region } from './types/region.types';
import { Injectable } from '@angular/core';

/**
 * The session service keeps track of where the guest or logged-in user left
 * off.
 */
@Injectable({
  providedIn: 'root'
})
export class SessionService {
  readonly region$ = new BehaviorSubject<Region|null>(null);

  constructor() {
    this.region$.next(localStorage.getItem('region') as Region|null);
  }

  /** Saves the region in local storage. */
  setRegion(value: Region) {
    if (Object.values(Region).includes(value)) {
      localStorage.setItem('region', value);
      this.region$.next(value);
    }
  }
}

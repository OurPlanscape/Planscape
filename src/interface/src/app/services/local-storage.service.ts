import { Injectable } from '@angular/core';

// available keys
type LocalStorageKey = 'planTable';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  constructor() {}

  setItem(key: LocalStorageKey, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getItem(key: LocalStorageKey) {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    return JSON.parse(item);
  }
}

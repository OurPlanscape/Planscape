import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { RedirectData } from '@services/redirect.service';

export abstract class BaseStorageService<T> {
  protected constructor(private key: string) {}

  setItem(value: T) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }

  getItem(): T | null {
    const item = localStorage.getItem(this.key);
    if (!item) {
      return null;
    }
    return JSON.parse(item) as T;
  }

  removeItem() {
    localStorage.removeItem(this.key);
  }
}

@Injectable({
  providedIn: 'root',
})
export class LoginRedirectStorageService extends BaseStorageService<RedirectData> {
  constructor() {
    super('loginRedirect');
  }
}

@Injectable({
  providedIn: 'root',
})
export class HomeParametersStorageService extends BaseStorageService<Params> {
  constructor() {
    super('homeParameters');
  }
}

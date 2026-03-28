import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { RedirectData } from './redirect.service';
import { BaseLayer, BaseMapType, DataLayer, Extent } from '@types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface StoredValue<T> {
  value: T;
  savedAt: number;
}

interface LocalStorageOptions<T> {
  maxAgeMs?: number;
}

function isStoredValue<T>(value: unknown): value is StoredValue<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'value' in value &&
    'savedAt' in value
  );
}

export abstract class BaseLocalStorageService<T> {
  protected constructor(
    private key: string,
    private options: LocalStorageOptions<T> = {}
  ) {}

  setItem(value: T) {
    const storedValue: StoredValue<T> = {
      value,
      savedAt: Date.now(),
    };
    localStorage.setItem(this.key, JSON.stringify(storedValue));
  }

  getItem(): T | null {
    const item = localStorage.getItem(this.key);
    if (!item) {
      return null;
    }

    try {
      const parsedItem = JSON.parse(item) as unknown;
      if (!isStoredValue<T>(parsedItem)) {
        this.removeItem();
        return null;
      }

      if (
        this.options.maxAgeMs &&
        Date.now() - parsedItem.savedAt > this.options.maxAgeMs
      ) {
        this.removeItem();
        return null;
      }

      if (!this.isValidValue(parsedItem.value)) {
        this.removeItem();
        return null;
      }

      return parsedItem.value;
    } catch {
      this.removeItem();
      return null;
    }
  }

  removeItem() {
    localStorage.removeItem(this.key);
  }

  protected isValidValue(value: unknown): value is T {
    return true;
  }
}

@Injectable({
  providedIn: 'root',
})
export class LoginRedirectStorageService extends BaseLocalStorageService<RedirectData> {
  static readonly storageKey = 'loginRedirect';

  constructor() {
    super(LoginRedirectStorageService.storageKey);
  }
}

@Injectable({
  providedIn: 'root',
})
export class HomeParametersStorageService extends BaseLocalStorageService<Params> {
  static readonly storageKey = 'homeParameters';

  constructor() {
    super(HomeParametersStorageService.storageKey);
  }
}

@Injectable({
  providedIn: 'root',
})
export class MultiMapsStorageService extends BaseLocalStorageService<{
  layoutMode?: 1 | 2 | 4;
  baseMap?: BaseMapType;
  extent?: Extent;
  baseLayers?: BaseLayer[] | null;
  dataLayers?: Record<number, DataLayer | null>;
  selectedMapId?: number | null;
}> {
  static readonly storageKey = 'multiMapsOptions';

  constructor() {
    super(MultiMapsStorageService.storageKey, {
      maxAgeMs: 7 * DAY_IN_MS,
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class ExploreStorageService extends BaseLocalStorageService<{
  tabIndex: number;
  isPanelExpanded: boolean;
  opacity: number;
}> {
  static readonly storageKey = 'exploreViewOptions';

  constructor() {
    super(ExploreStorageService.storageKey, {
      maxAgeMs: 7 * DAY_IN_MS,
    });
  }

  protected override isValidValue(
    value: unknown
  ): value is {
    tabIndex: number;
    isPanelExpanded: boolean;
    opacity: number;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'tabIndex' in value &&
      'isPanelExpanded' in value &&
      'opacity' in value &&
      typeof value.tabIndex === 'number' &&
      typeof value.isPanelExpanded === 'boolean' &&
      typeof value.opacity === 'number'
    );
  }
}

import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { RedirectData } from './redirect.service';
import { BaseLayer, BaseMapType, Extent } from '@types';
import { BrowseDataLayer } from '@api/planscapeAPI.schemas';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface StoredValue<T> {
  value: T;
  savedAt: number;
}

interface LocalStorageOptions {
  maxAgeMs?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredValue<T>(value: unknown): value is StoredValue<T> {
  return isObject(value) && 'value' in value && 'savedAt' in value;
}

export abstract class BaseLocalStorageService<T> {
  protected constructor(
    private key: string,
    private options: LocalStorageOptions = { maxAgeMs: 7 * DAY_IN_MS }
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

      // Guard against legacy/incompatible cache formats (e.g. values written
      // before the {value, savedAt} wrapper was introduced). If the shape
      // doesn't match, discard so callers start fresh.
      if (!isStoredValue<T>(parsedItem)) {
        this.removeItem();
        return null;
      }

      // Invalidate entries older than the configured max age. The item is
      // removed so the next write starts a fresh expiry window.
      if (
        this.options.maxAgeMs &&
        Date.now() - parsedItem.savedAt > this.options.maxAgeMs
      ) {
        this.removeItem();
        return null;
      }

      // Validate the stored value against the subclass schema. This guards
      // against reading data written by an older version of the app with a
      // different shape.
      if (!this.isValidValue(parsedItem.value)) {
        this.removeItem();
        return null;
      }

      // Refresh savedAt on every successful read so the expiry window slides
      // forward — actively-used data is never evicted.
      this.setItem(parsedItem.value);
      return parsedItem.value;
    } catch {
      // JSON.parse failed — the stored string is corrupted or was written by
      // something else. Discard it so the caller can recover.
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

  protected override isValidValue(value: unknown): value is RedirectData {
    return (
      isObject(value) &&
      typeof value['url'] === 'string' &&
      (value['userHash'] === null || typeof value['userHash'] === 'string')
    );
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

  protected override isValidValue(value: unknown): value is Params {
    return isObject(value);
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
  dataLayers?: Record<number, BrowseDataLayer | null>;
  selectedMapId?: number | null;
}> {
  static readonly storageKey = 'multiMapsOptions';

  constructor() {
    super(MultiMapsStorageService.storageKey);
  }

  protected override isValidValue(value: unknown): value is {
    layoutMode?: 1 | 2 | 4;
    baseMap?: BaseMapType;
    extent?: Extent;
    baseLayers?: BaseLayer[] | null;
    dataLayers?: Record<number, BrowseDataLayer | null>;
    selectedMapId?: number | null;
  } {
    return isObject(value);
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
    super(ExploreStorageService.storageKey);
  }

  protected override isValidValue(value: unknown): value is {
    tabIndex: number;
    isPanelExpanded: boolean;
    opacity: number;
  } {
    return (
      isObject(value) &&
      typeof value['tabIndex'] === 'number' &&
      typeof value['isPanelExpanded'] === 'boolean' &&
      typeof value['opacity'] === 'number'
    );
  }
}

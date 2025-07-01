import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { RedirectData } from '@services/redirect.service';
import {
  BaseLayer,
  DataLayer,
  Extent,
  MapConfig,
  MapViewOptions,
  Region,
} from '@types';
import { BaseMapType } from '../types/maplibre.map.types';

export abstract class BaseLocalStorageService<T> {
  protected constructor(private key: string) {}

  setItem(value: T) {
    if (typeof value === 'string') {
      localStorage.setItem(this.key, value);
    } else {
      localStorage.setItem(this.key, JSON.stringify(value));
    }
  }

  getItem(): T | null {
    const item = localStorage.getItem(this.key);
    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item) as T;
    } catch (e) {
      return item as unknown as T;
    }
  }

  removeItem() {
    localStorage.removeItem(this.key);
  }
}

@Injectable({
  providedIn: 'root',
})
export class LoginRedirectStorageService extends BaseLocalStorageService<RedirectData> {
  constructor() {
    super('loginRedirect');
  }
}

@Injectable({
  providedIn: 'root',
})
export class HomeParametersStorageService extends BaseLocalStorageService<Params> {
  constructor() {
    super('homeParameters');
  }
}

@Injectable({
  providedIn: 'root',
})
export class RegionStorageService extends BaseLocalStorageService<Region> {
  constructor() {
    super('region');
  }
}

@Injectable({
  providedIn: 'root',
})
export class MapViewOptionsStorageService extends BaseLocalStorageService<MapViewOptions> {
  constructor() {
    super('mapViewOptions');
  }
}

@Injectable({
  providedIn: 'root',
})
export class MapConfigsStorageService extends BaseLocalStorageService<Record<
  Region,
  MapConfig[]
> | null> {
  constructor() {
    super('mapConfigs');
  }
}

// Explore 2.0 storage
@Injectable({
  providedIn: 'root',
})
export class MultiMapsStorageService extends BaseLocalStorageService<{
  layoutMode?: 1 | 2 | 4;
  baseMap?: BaseMapType;
  extent?: Extent;
  baseLayers?: BaseLayer[] | null;
  dataLayers?: Record<number, DataLayer | null>;
}> {
  constructor() {
    super('multiMapsOptions');
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
  constructor() {
    super('exploreViewOptions');
  }
}

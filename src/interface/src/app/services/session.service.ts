import { BehaviorSubject, interval, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { MapConfig, MapViewOptions, Region } from '@types';
import {
  defaultMapConfig,
  defaultMapConfigsDictionary,
  defaultMapViewOptions,
} from '../map/map.helper';
import {
  MapConfigsStorageService,
  MapViewOptionsStorageService,
  RegionStorageService,
} from '@services/local-storage.service';

/** How often the user's session should be saved to local storage (in ms). */
const SESSION_SAVE_INTERVAL = 600;

/**
 * The session service keeps track of where the guest or logged-in user left
 * off.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionService {
  /** Components can subscribe to this Observable to perform operations repeatedly
   *  at a set interval (like saving state). */
  readonly sessionInterval$: Observable<number> = interval(
    SESSION_SAVE_INTERVAL
  );

  readonly mapConfigs$ = new BehaviorSubject<Record<
    Region,
    MapConfig[]
  > | null>(defaultMapConfigsDictionary());
  readonly mapViewOptions$ = new BehaviorSubject<MapViewOptions | null>(null);
  readonly region$ = new BehaviorSubject<Region | null>(null);

  constructor(
    private regionStorageService: RegionStorageService,
    private mapViewOptionsStorageService: MapViewOptionsStorageService,
    private mapConfigsStorageService: MapConfigsStorageService
  ) {
    const storedMapConfigs = this.mapConfigsStorageService.getItem();
    if (storedMapConfigs && this.validateSavedMapConfigs(storedMapConfigs)) {
      this.mapConfigs$.next(storedMapConfigs);
    }
    const storedMapViewOptions = this.mapViewOptionsStorageService.getItem();
    if (
      storedMapViewOptions &&
      this.validateSavedMapViewOptions(storedMapViewOptions)
    ) {
      this.mapViewOptions$.next(storedMapViewOptions);
    }
    const savedRegion = this.regionStorageService.getItem();
    if (!!savedRegion) {
      this.setRegion(savedRegion);
    } else {
      this.setRegion(Region.SIERRA_NEVADA);
    }
  }

  /** Emits the map configs and saves them in local storage. */
  setMapConfigs(value: MapConfig[], region?: Region) {
    let regionIndex: Region | null = region || this.region$.getValue();
    if (!regionIndex) {
      regionIndex = Region.SIERRA_NEVADA;
    }
    let mapConf: Record<Region, MapConfig[]> | null =
      this.mapConfigs$.getValue();
    if (mapConf && regionIndex) {
      mapConf![regionIndex] = value;
    }
    this.mapConfigs$.next(mapConf);
    this.mapConfigsStorageService.setItem(mapConf);
  }

  /** Emits the map view options and saves them in local storage. */
  setMapViewOptions(value: MapViewOptions) {
    this.mapViewOptionsStorageService.setItem(value);
    this.mapViewOptions$.next(value);
  }

  /**
   * Emits the region and saves it in local storage. Saves the default region if local storage's
   * value does not match a region (i.e. enum was changed, but user still has old value stored).
   */
  setRegion(value: Region) {
    if (Object.values(Region).includes(value)) {
      this.regionStorageService.setItem(value);
      this.region$.next(value);
    } else {
      this.regionStorageService.setItem(Region.SIERRA_NEVADA);
      this.region$.next(Region.SIERRA_NEVADA);
    }
  }

  /** Validates the map configs loaded from local storage to ensure all required fields
   *  are present. */
  private validateSavedMapConfigs(data: Record<Region, MapConfig[]>): boolean {
    for (var regionConfig of Object.values(data)) {
      for (var mapConfig of Object.values(regionConfig)) {
        if (!this.instanceOfMapConfig(mapConfig)) {
          console.error('not valid config ' + JSON.stringify(mapConfig));
          return false;
        }
      }
    }
    for (var region of Object.keys(data)) {
      if (!Object.values(Region).includes(region as unknown as Region)) {
        console.error('Config key not valid Region ' + region);
        return false;
      }
    }

    return true;
  }

  private instanceOfMapConfig(data: any): boolean {
    const mapConfigExample: MapConfig = defaultMapConfig();
    return (
      Object.keys(data).sort().join(',') ===
      Object.keys(mapConfigExample).sort().join(',')
    );
  }

  /** Validates the map view options loaded from local storage to ensure all required fields
   *  are present. */
  private validateSavedMapViewOptions(data: MapViewOptions): boolean {
    return (
      Object.keys(data).sort().join(',') ===
      Object.keys(defaultMapViewOptions()).sort().join(',')
    );
  }
}

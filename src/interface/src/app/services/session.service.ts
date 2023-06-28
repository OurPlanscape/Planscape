import { BehaviorSubject, interval, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import {
  defaultMapConfig,
  defaultMapViewOptions,
  MapConfig,
  MapViewOptions,
  Region,
} from '../types';

/** How often the user's session should be saved to local storage (in ms). */
const SESSION_SAVE_INTERVAL = 60000;

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

  readonly record =  {
    [Region.SIERRA_NEVADA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.SOUTHERN_CALIFORNIA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.NORTHERN_CALIFORNIA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.CENTRAL_COAST] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
  }
  

  readonly mapConfigs$ = new BehaviorSubject<Record<Region, MapConfig[]> | null>(this.record);
  readonly mapViewOptions$ = new BehaviorSubject<MapViewOptions | null>(null);
  readonly region$ = new BehaviorSubject<Region | null>(null);

  constructor() {
    const storedMapConfigs = localStorage.getItem('mapConfigs');
    if (storedMapConfigs && this.validateSavedMapConfigs(storedMapConfigs)) {
      this.mapConfigs$.next(JSON.parse(storedMapConfigs));
    }
    const storedMapViewOptions = localStorage.getItem('mapViewOptions');
    if (
      storedMapViewOptions &&
      this.validateSavedMapViewOptions(storedMapViewOptions)
    ) {
      this.mapViewOptions$.next(JSON.parse(storedMapViewOptions));
    }
    const savedRegion = localStorage.getItem('region');
    if (!!savedRegion) {
      this.setRegion(savedRegion as Region);
    } else {
      this.setRegion(Region.SIERRA_NEVADA);
    }
  }

  /** Emits the map configs and saves them in local storage. */
  //TODO make map config region based dictionary 
  setMapConfigs(value: MapConfig[]) {
    var regionIndex: Region | null = this.region$.getValue();
    if(!regionIndex){
      regionIndex = Region.SIERRA_NEVADA;
    }
    var mapConf: Record<Region, MapConfig[]> | null= this.mapConfigs$.getValue();
    if(mapConf && regionIndex){
      mapConf![regionIndex] = value;
      
    }
    this.mapConfigs$.next(mapConf);
    localStorage.setItem('mapConfigs', JSON.stringify(mapConf));
  }

  /** Emits the map view options and saves them in local storage. */
  setMapViewOptions(value: MapViewOptions) {
    localStorage.setItem('mapViewOptions', JSON.stringify(value));
    this.mapViewOptions$.next(value);
  }

  /**
   * Emits the region and saves it in local storage. Saves the default region if local storage's
   * value does not match a region (i.e. enum was changed, but user still has old value stored).
   */
  setRegion(value: Region) {
    if (Object.values(Region).includes(value)) {
      localStorage.setItem('region', value);
      this.region$.next(value);
    } else {
      localStorage.setItem('region', Region.SIERRA_NEVADA);
      this.region$.next(Region.SIERRA_NEVADA);
    }
  }

  /** Validates the map configs loaded from local storage to ensure all required fields
   *  are present. */
  private validateSavedMapConfigs(data: string): boolean {
    const configs: any[] = JSON.parse(data);
    for( var regionConfig of Object.values(configs)){
      for (var mapConfig of Object.values(regionConfig)){
        if(!this.instanceOfMapConfig(mapConfig)){
          console.log('not valid config ' + JSON.stringify(mapConfig));
          return false;
        }
      }
    }
    for(var region of Object.keys(configs)){
      if(!Object.values(Region).includes(region as unknown as Region)){
        console.log('Config key not valid Region ' + region);
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
  private validateSavedMapViewOptions(data: string): boolean {
    const mapViewOptions: MapViewOptions = JSON.parse(data);
    return (
      Object.keys(data).sort().join(',') ===
      Object.keys(defaultMapViewOptions()).sort().join(',')
    );
  }
}

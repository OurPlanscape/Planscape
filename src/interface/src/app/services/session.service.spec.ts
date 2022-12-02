import { Region } from '../types/region.types';
import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';
import { defaultMapConfig, MapViewOptions } from '../types';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save map configs', () => {
    const testMapConfigs = Array(4).fill(defaultMapConfig());
    const spyStorage = spyOn(localStorage, 'setItem');

    service.setMapConfigs(testMapConfigs);

    expect(spyStorage).toHaveBeenCalledOnceWith(
      'mapConfigs',
      JSON.stringify(testMapConfigs)
    );
    expect(service.mapConfigs$.value).toBe(testMapConfigs);
  });

  it('should save map view options', () => {
    const testMapViewOptions: MapViewOptions = {
      numVisibleMaps: 4,
      selectedMapIndex: 1,
    };
    const spyStorage = spyOn(localStorage, 'setItem');

    service.setMapViewOptions(testMapViewOptions);

    expect(spyStorage).toHaveBeenCalledOnceWith(
      'mapViewOptions',
      JSON.stringify(testMapViewOptions)
    );
    expect(service.mapViewOptions$.value).toBe(testMapViewOptions);
  });

  it('should save region', () => {
    const testRegion = Region.NORTHERN_CALIFORNIA;
    const spyStorage = spyOn(localStorage, 'setItem');

    service.setRegion(testRegion);

    expect(spyStorage).toHaveBeenCalledOnceWith('region', testRegion);
    expect(service.region$.value).toBe(testRegion);
  });
});

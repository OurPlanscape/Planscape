import { MapViewOptions, Region } from '@types';
import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import {
  defaultMapConfigsDictionary,
  defaultMapViewOptions,
} from '../map/map.helper';

class LocalStorageMock {
  store: { [key: string]: string } = {};

  get length() {
    return Object.keys(this.store).length;
  }

  key = (index: number) => {
    return Object.keys(this.store)[index] ?? null;
  };
  getItem = (key: string) => {
    return this.store[key] ?? null;
  };
  setItem = (key: string, value: string) => {
    this.store[key] = `${value}`;
  };
  removeItem = (key: string) => {
    delete this.store[key];
  };
  clear = () => {
    this.store = {};
  };
}

describe('SessionService', () => {
  describe('Initialization', () => {
    let service: SessionService;
    let mockLocalStorage: Storage;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      mockLocalStorage = new LocalStorageMock();
      spyOn(localStorage, 'getItem').and.callFake(mockLocalStorage.getItem);
      spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);
    });

    it('should be created', () => {
      service = TestBed.inject(SessionService);

      expect(service).toBeTruthy();
    });

    it('should default to sierra nevada', () => {
      service = TestBed.inject(SessionService);

      expect(service.region$.value).toBe(Region.SIERRA_NEVADA);
    });

    it('should default to sierra nevada when the saved value is invalid', () => {
      mockLocalStorage.setItem('region', 'invalid');
      service = TestBed.inject(SessionService);

      expect(service.region$.value).toBe(Region.SIERRA_NEVADA);
    });

    it('should get the saved region', () => {
      mockLocalStorage.setItem('region', Region.CENTRAL_COAST);
      service = TestBed.inject(SessionService);

      expect(service.region$.value).toBe(Region.CENTRAL_COAST);
    });
  });

  describe('Local storage', () => {
    let service: SessionService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(SessionService);
    });

    it('should save map configs', () => {
      const testMapConfigs = defaultMapConfigsDictionary();
      const spyStorage = spyOn(localStorage, 'setItem');

      service.setMapConfigs(testMapConfigs['Sierra Nevada']);

      expect(spyStorage).toHaveBeenCalledOnceWith(
        'mapConfigs',
        JSON.stringify(testMapConfigs)
      );
      expect(service.mapConfigs$.value!['Sierra Nevada']).toBe(
        testMapConfigs['Sierra Nevada']
      );
    });

    it('should save map view options', () => {
      const testMapViewOptions: MapViewOptions = defaultMapViewOptions();
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
});

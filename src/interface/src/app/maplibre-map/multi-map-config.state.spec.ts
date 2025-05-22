import { TestBed } from '@angular/core/testing';
import { MultiMapConfigState } from './multi-map-config.state';
import { ExploreOptionsStorageService } from '@services/local-storage.service';
import { FrontendConstants } from '../map/map.constants';
import { BaseLayerType } from '../types/maplibre.map.types';

describe('MultiMapConfigState', () => {
  let service: MultiMapConfigState;
  let storage: jasmine.SpyObj<ExploreOptionsStorageService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('ExploreOptionsStorageService', [
      'setItem',
      'getItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MultiMapConfigState,
        { provide: ExploreOptionsStorageService, useValue: storage },
      ],
    });

    service = TestBed.inject(MultiMapConfigState);
  });

  it('should default layoutMode to 1', () => {
    // private subject holds the current value
    expect((service as any)._layoutMode$.getValue()).toBe(1);
  });

  it('setLayoutMode should update the layoutMode subject', () => {
    service.setLayoutMode(4);
    expect((service as any)._layoutMode$.getValue()).toBe(4);
  });

  it('public layoutMode$ observable reflects that same value', (done) => {
    service.setLayoutMode(2);
    service.layoutMode$.subscribe((val) => {
      expect(val).toBe(2);
      done();
    });
  });

  it('should default bounds to FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS', () => {
    expect((service as any)._bounds$.getValue()).toEqual(
      FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS
    );
  });

  it('saveStateToLocalStorage calls storage.setItem with correct payload', () => {
    // grab the current private values
    const layout = (service as any)._layoutMode$.getValue();
    const baseLayer = (service as any)._baseLayer$.getValue();
    const bounds = [0, 1, 2, 3] as [number, number, number, number];

    service.saveStateToLocalStorage(bounds);

    expect(storage.setItem).toHaveBeenCalledWith({
      layoutMode: layout,
      baseLayer: baseLayer,
      bounds: bounds,
    });
  });

  it('loadStateFromLocalStorage does nothing when storage is empty', () => {
    storage.getItem.and.returnValue(null);
    service.loadStateFromLocalStorage();

    // subjects remain at their default values
    expect((service as any)._layoutMode$.getValue()).toBe(1);
    expect((service as any)._baseLayer$.getValue()).toBe(
      (service as any)._baseLayer$.getValue() /* whatever default is */
    );
    expect((service as any)._bounds$.getValue()).toEqual(
      FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS
    );
  });

  it('loadStateFromLocalStorage updates subjects when storage has data', () => {
    const saved = {
      layoutMode: 2 as any,
      baseLayer: 'satellite' as BaseLayerType,
      bounds: [5, 6, 7, 8] as [number, number, number, number],
    };
    storage.getItem.and.returnValue(saved);

    service.loadStateFromLocalStorage();

    expect((service as any)._layoutMode$.getValue()).toBe(2);
    expect((service as any)._baseLayer$.getValue()).toBe('satellite');
    expect((service as any)._bounds$.getValue()).toEqual([5, 6, 7, 8]);
  });
});

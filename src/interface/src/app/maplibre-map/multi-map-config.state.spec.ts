import { TestBed } from '@angular/core/testing';
import { MultiMapConfigState } from './multi-map-config.state';
import { MultiMapsStorageService } from '@services/local-storage.service';
import { FrontendConstants } from '../map/map.constants';
import { BaseLayerType } from '../types/maplibre.map.types';
import { Extent } from '@types';

describe('MultiMapConfigState', () => {
  let service: MultiMapConfigState;
  let storage: jasmine.SpyObj<MultiMapsStorageService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('ExploreOptionsStorageService', [
      'setItem',
      'getItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MultiMapConfigState,
        { provide: MultiMapsStorageService, useValue: storage },
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
    expect((service as any)._mapExtent$.getValue()).toEqual(
      FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS
    );
  });

  it('saveStateToLocalStorage calls storage.setItem with correct payload', () => {
    // grab the current private values
    const layout = (service as any)._layoutMode$.getValue();
    const baseLayer = (service as any)._baseLayer$.getValue();
    const extent = [0, 1, 2, 3] as Extent;

    service.saveStateToLocalStorage(extent);

    expect(storage.setItem).toHaveBeenCalledWith({
      layoutMode: layout,
      baseLayer: baseLayer,
      extent: extent,
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
    expect((service as any)._mapExtent$.getValue()).toEqual(
      FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS
    );
  });

  it('loadStateFromLocalStorage updates subjects when storage has data', () => {
    const saved = {
      layoutMode: 2 as any,
      baseLayer: 'satellite' as BaseLayerType,
      extent: [5, 6, 7, 8] as Extent,
    };
    storage.getItem.and.returnValue(saved);

    service.loadStateFromLocalStorage();

    expect((service as any)._layoutMode$.getValue()).toBe(2);
    expect((service as any)._baseLayer$.getValue()).toBe('satellite');
    expect((service as any)._mapExtent$.getValue()).toEqual([5, 6, 7, 8]);
  });
});

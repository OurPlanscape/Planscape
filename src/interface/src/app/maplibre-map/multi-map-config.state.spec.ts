import { TestBed } from '@angular/core/testing';
import { MultiMapConfigState } from './multi-map-config.state';
import { MultiMapsStorageService } from '@services/local-storage.service';

import { BaseMapType } from '@types';
import { BaseLayer, Extent } from '@types';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { BehaviorSubject } from 'rxjs';
import { FrontendConstants } from '@map/map.constants';

describe('MultiMapConfigState', () => {
  let service: MultiMapConfigState;
  let storage: jasmine.SpyObj<MultiMapsStorageService>;
  let selectedLayers$ = new BehaviorSubject<BaseLayer[] | null>(null);

  beforeEach(() => {
    storage = jasmine.createSpyObj('ExploreOptionsStorageService', [
      'setItem',
      'getItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MultiMapConfigState,
        { provide: MultiMapsStorageService, useValue: storage },
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: selectedLayers$,
          setBaseLayers: (layers) => selectedLayers$.next(layers),
        }),
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
    const baseMap = (service as any)._baseMap$.getValue();
    const extent = [0, 1, 2, 3] as Extent;
    const baseLayers = [{ id: 1 } as BaseLayer];

    //set base layers
    selectedLayers$.next(baseLayers);

    service.saveStateToLocalStorage(extent);

    expect(storage.setItem).toHaveBeenCalledWith({
      layoutMode: layout,
      baseMap: baseMap,
      extent: extent,
      baseLayers: baseLayers,
      selectedMapId: 1,
    });
  });

  it('loadStateFromLocalStorage does nothing when storage is empty', () => {
    storage.getItem.and.returnValue(null);
    service.loadStateFromLocalStorage();

    // subjects remain at their default values
    expect((service as any)._layoutMode$.getValue()).toBe(1);
    expect((service as any)._baseMap$.getValue()).toBe(
      (service as any)._baseMap$.getValue() /* whatever default is */
    );
    expect((service as any)._mapExtent$.getValue()).toEqual(
      FrontendConstants.MAPLIBRE_DEFAULT_BOUNDS
    );
  });

  it('loadStateFromLocalStorage updates subjects when storage has data', () => {
    const saved = {
      layoutMode: 2 as any,
      baseMap: 'satellite' as BaseMapType,
      extent: [5, 6, 7, 8] as Extent,
      baseLayers: [{ id: 1 } as BaseLayer],
    };
    storage.getItem.and.returnValue(saved);

    service.loadStateFromLocalStorage();

    expect((service as any)._layoutMode$.getValue()).toBe(2);
    expect((service as any)._baseMap$.getValue()).toBe('satellite');
    expect((service as any)._mapExtent$.getValue()).toEqual([5, 6, 7, 8]);
    expect(selectedLayers$.value).toEqual([{ id: 1 } as BaseLayer]);
  });
});

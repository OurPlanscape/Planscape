import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { BaseLayersStateService } from './base-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DataLayersService } from '@services/data-layers.service';
import { of } from 'rxjs';
import { BaseLayer } from '@types';

describe('BaseLayersStateService', () => {
  let service: BaseLayersStateService;

  const makeLayer = (id: number, category: string): any => ({
    id,
    name: `Layer ${id}`,
    path: [category],
  });

  const mockLayers = [
    {
      id: 1,
      name: 'State',
      path: ['Elevation'],
    },
    {
      id: 2,
      name: 'Department of Defense',
      path: ['Elevation'],
    },
    {
      id: 3,
      name: 'County',
      path: ['Landcover'],
    },
  ] as BaseLayer[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BaseLayersStateService,
        MockProvider(DataLayersService, {
          listBaseLayers: () => of(mockLayers),
        }),
      ],
    });

    service = TestBed.inject(BaseLayersStateService);
  });

  it('should start with null selection', (done) => {
    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toBeNull();
      done();
    });
  });

  it('should select a single base layer if none is selected', (done) => {
    const layer = makeLayer(1, 'catA');
    service.updateBaseLayers(layer, false);

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer]);
      done();
    });
  });

  it('should replace selection with a non-multi layer of same category', (done) => {
    const layer1 = makeLayer(1, 'catA');
    const layer2 = makeLayer(2, 'catA');

    service.updateBaseLayers(layer1, true);
    service.updateBaseLayers(layer2, false);

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer2]);
      done();
    });
  });

  it('should add to selection if same category and multi is true', (done) => {
    const layer1 = makeLayer(1, 'catA');
    const layer2 = makeLayer(2, 'catA');

    service.updateBaseLayers(layer1, true);
    service.updateBaseLayers(layer2, true);

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer1, layer2]);
      done();
    });
  });

  it('should remove if already selected multi layer is selected again', (done) => {
    const layer = makeLayer(1, 'catA');

    service.updateBaseLayers(layer, true);
    service.updateBaseLayers(layer, true); // selecting the same one again

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([]);
      done();
    });
  });

  it('should replace selection when multi=true but category differs', (done) => {
    const layer1 = makeLayer(1, 'catA');
    const layer2 = makeLayer(2, 'catB');

    service.updateBaseLayers(layer1, true);
    service.updateBaseLayers(layer2, true);

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer2]);
      done();
    });
  });

  it('should clear the selection', (done) => {
    const layer = makeLayer(1, 'catA');
    service.updateBaseLayers(layer, true);

    service.clearBaseLayer();

    service.selectedBaseLayers$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toBeNull();
      done();
    });
  });

  it('should group base layers by category using path[0], sorted', (done) => {
    service.categorizedBaseLayers$.pipe(take(1)).subscribe((groups) => {
      expect(groups.length).toBe(2);

      const elevationGroup = groups.find(
        (g) => g.category.name === 'Elevation'
      );
      const landcoverGroup = groups.find(
        (g) => g.category.name === 'Landcover'
      );

      expect(elevationGroup).toBeDefined();
      expect(landcoverGroup).toBeDefined();

      expect(elevationGroup?.layers.length).toBe(2);
      expect(landcoverGroup?.layers.length).toBe(1);

      expect(elevationGroup?.layers[0].name).toBe('Department of Defense');
      expect(elevationGroup?.layers[1].name).toBe('State');
      expect(landcoverGroup?.layers[0].name).toBe('County');

      done();
    });
  });
});

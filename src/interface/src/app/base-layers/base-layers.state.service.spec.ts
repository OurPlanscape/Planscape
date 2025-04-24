import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { BaseLayersStateService } from './base-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DataLayersService } from '@services/data-layers.service';
import { of } from 'rxjs';
import { BaseLayer } from '@types';

describe('BaseLayersStateService', () => {
  let service: BaseLayersStateService;

  const makeLayer = (
    id: number,
    category: string,
    multi: boolean = false
  ): any => ({
    id,
    name: `Layer ${id}`,
    path: [category],
    multi,
  });

  const mockLayers = [
    {
      id: 1,
      name: 'Layer 1',
      path: ['Elevation'],
    },
    {
      id: 2,
      name: 'Layer 2',
      path: ['Elevation'],
    },
    {
      id: 3,
      name: 'Layer 3',
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
    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toBeNull();
      done();
    });
  });

  it('should select a single base layer if none is selected', (done) => {
    const layer = makeLayer(1, 'catA', false);
    service.selectBaseLayer(layer);

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer]);
      done();
    });
  });

  it('should replace selection with a non-multi layer of same category', (done) => {
    const layer1 = makeLayer(1, 'catA', true);
    const layer2 = makeLayer(2, 'catA', false);

    service.selectBaseLayer(layer1);
    service.selectBaseLayer(layer2);

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer2]);
      done();
    });
  });

  it('should add to selection if same category and multi is true', (done) => {
    const layer1 = makeLayer(1, 'catA', true);
    const layer2 = makeLayer(2, 'catA', true);

    service.selectBaseLayer(layer1);
    service.selectBaseLayer(layer2);

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer1, layer2]);
      done();
    });
  });

  it('should ignore if already selected multi layer is selected again', (done) => {
    const layer = makeLayer(1, 'catA', true);

    service.selectBaseLayer(layer);
    service.selectBaseLayer(layer); // selecting the same one again

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer]);
      done();
    });
  });

  it('should replace selection when multi=true but category differs', (done) => {
    const layer1 = makeLayer(1, 'catA', true);
    const layer2 = makeLayer(2, 'catB', true);

    service.selectBaseLayer(layer1);
    service.selectBaseLayer(layer2);

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toEqual([layer2]);
      done();
    });
  });

  it('should clear the selection', (done) => {
    const layer = makeLayer(1, 'catA');
    service.selectBaseLayer(layer);

    service.clearBaseLayer();

    service.selectedBaseLayer$.pipe(take(1)).subscribe((layers) => {
      expect(layers).toBeNull();
      done();
    });
  });

  it('should group base layers by category using path[0]', (done) => {
    service.categorizedBaseLayers$.pipe(take(1)).subscribe((grouped) => {
      expect(Object.keys(grouped)).toEqual(['Elevation', 'Landcover']);
      expect(grouped['Elevation'].length).toBe(2);
      expect(grouped['Landcover'].length).toBe(1);
      expect(grouped['Elevation'][0].name).toBe('Layer 1');
      expect(grouped['Landcover'][0].name).toBe('Layer 3');
      done();
    });
  });
});

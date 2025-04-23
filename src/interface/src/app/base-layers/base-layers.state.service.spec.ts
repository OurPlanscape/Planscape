import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { BaseLayersStateService } from './base-layers.state.service';

describe('BaseLayersStateService', () => {
  let service: BaseLayersStateService;

  const makeLayer = (
    id: number,
    category: string,
    multi: boolean = false
  ): any => ({
    id,
    name: `Layer ${id}`,
    category,
    multi,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
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
});

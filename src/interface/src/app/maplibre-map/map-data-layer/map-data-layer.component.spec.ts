import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockBuilder, MockRender } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { StyleJson } from '@types';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigState } from '../map-config.state';
import { createMapLibreMock } from '@testing/maplibre-gl.mock';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let mockMap: ReturnType<typeof createMapLibreMock>;
  const dataLayerWithUrl$ = new BehaviorSubject<any>(null);
  const draftStyle$ = new BehaviorSubject<StyleJson | null>(null);
  const ownStyle: StyleJson = {
    map_type: 'RAMP',
    entries: [
      { value: 0, color: '#000000' },
      { value: 1, color: '#ffffff' },
    ],
  };

  beforeEach(() =>
    MockBuilder(MapDataLayerComponent)
      .keep(HttpClientTestingModule)
      .keep(MatSnackBarModule)
      .mock(DataLayersStateService, {
        dataLayerWithUrl$: dataLayerWithUrl$,
        draftStyle$: draftStyle$,
      })
      .mock(MapConfigState, {
        dataLayersOpacity$: of(0.75),
      })
  );

  beforeEach(() => {
    dataLayerWithUrl$.next(null);
    draftStyle$.next(null);
    mockMap = createMapLibreMock();
    const fixture = MockRender(MapDataLayerComponent, {
      mapLibreMap: mockMap as any,
    });
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('recolors with a draft style without fetching the URL again', () => {
    const colorFunctions = spyOn(component as any, 'applyColorFunction');
    const layer = {
      id: 9,
      info: { blockxsize: 256 },
      styles: [{ id: 1, data: ownStyle }],
    };
    dataLayerWithUrl$.next({ layer, url: 'https://cog.example/layer.tif' });
    const draft: StyleJson = { ...ownStyle, map_type: 'INTERVALS' };
    draftStyle$.next(draft);

    expect(colorFunctions.calls.allArgs()).toEqual([
      ['https://cog.example/layer.tif', ownStyle],
      ['https://cog.example/layer.tif', draft],
    ]);
  });

  describe('redrawing', () => {
    const url = 'https://cog.example/layer.tif';
    const draft: StyleJson = { ...ownStyle, map_type: 'INTERVALS' };
    const layerWith = (style: StyleJson) => ({
      id: 9,
      info: { blockxsize: 256 },
      styles: [{ id: 1, data: style }],
    });
    let redraws: jasmine.Spy;

    beforeEach(() => {
      redraws = spyOn(component, 'addRasterLayer');
      mockMap.getLayer.and.returnValue({} as any);
      dataLayerWithUrl$.next({ layer: layerWith(ownStyle), url });
      draftStyle$.next(draft);
      redraws.calls.reset();
    });

    it('skips the redraw when the saved style replaces an identical draft', () => {
      dataLayerWithUrl$.next({ layer: layerWith(draft), url });
      draftStyle$.next(null);

      expect(redraws).not.toHaveBeenCalled();
    });

    it('redraws when the saved style differs from the draft', () => {
      dataLayerWithUrl$.next({ layer: layerWith(draft), url });
      draftStyle$.next({ ...ownStyle, map_type: 'VALUES' });

      expect(redraws).toHaveBeenCalledTimes(1);
    });

    it('redraws when the same layer comes back to retry', () => {
      const current = dataLayerWithUrl$.value;
      dataLayerWithUrl$.next({ layer: current.layer, url });

      expect(redraws).toHaveBeenCalledTimes(1);
    });
  });
});

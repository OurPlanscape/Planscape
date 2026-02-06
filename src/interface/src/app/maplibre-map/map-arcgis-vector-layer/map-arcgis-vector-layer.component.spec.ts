import { TestBed } from '@angular/core/testing';
import {
  MockBuilder,
  MockedComponentFixture,
  MockProvider,
  MockRender,
} from 'ng-mocks';
import { MapArcgisVectorLayerComponent } from './map-arcgis-vector-layer.component';
import { MapLayerMouseEvent } from 'maplibre-gl';
import { of } from 'rxjs';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';

function createMapSpy() {
  return jasmine.createSpyObj('MapLibreMap', [
    'addLayer',
    'removeLayer',
    'addSource',
    'removeSource',
    'getSource',
    'getLayer',
    'setFeatureState',
    'on',
    'off',
  ]);
}

function makeLayer(id = 1): any {
  return {
    id,
    name: 'layer',
    map_url: 'http://vector',
    styles: [{ data: { 'fill-outline-color': '#000' } }],
    metadata: {},
  };
}

beforeEach(() => MockBuilder(MapArcgisVectorLayerComponent));

describe('MapArcgisVectorLayerComponent', () => {
  let fixture: MockedComponentFixture<
    MapArcgisVectorLayerComponent,
    { mapLibreMap: any; layer: any }
  >;
  let map: ReturnType<typeof createMapSpy>;

  beforeEach(() => {
    map = createMapSpy();
    TestBed.configureTestingModule({
      providers: [
        MockProvider(BaseLayersStateService, {
          enableBaseLayerHover$: of(true),
        }),
      ],
    });
    fixture = MockRender(MapArcgisVectorLayerComponent, {
      mapLibreMap: map,
      layer: makeLayer(),
    });
  });

  it('adds layers and registers listeners on init', () => {
    expect(map.addSource).toHaveBeenCalled(); // plugin call
    expect(map.addLayer.calls.count()).toBe(2); // our layers
    expect(map.on).toHaveBeenCalledWith(
      'mousemove',
      'arcgis_layer_fill_1',
      jasmine.any(Function)
    );
  });

  it('toggles feature‑state on hover', () => {
    const moveCb = map.on.calls
      .all()
      .find((c: any) => c.args[0] === 'mousemove')!.args[2] as (
      e: MapLayerMouseEvent
    ) => void;
    const leaveCb = map.on.calls
      .all()
      .find((c: any) => c.args[0] === 'mouseleave')!.args[2] as () => void;

    moveCb({ features: [{ id: 10 }] } as any);
    moveCb({ features: [{ id: 11 }] } as any);
    leaveCb();

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'arcgis_source_1', id: 10 },
      { hover: false }
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'arcgis_source_1', id: 11 },
      { hover: true }
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'arcgis_source_1', id: 11 },
      { hover: false }
    );
  });

  it('removes listeners and layers on destroy', () => {
    fixture.destroy();
    expect(map.off).toHaveBeenCalledWith(
      'mousemove',
      'arcgis_layer_fill_1',
      jasmine.any(Function)
    );
    expect(map.removeLayer).toHaveBeenCalledWith('arcgis_layer_fill_1');
    expect(map.removeLayer).toHaveBeenCalledWith('arcgis_layer_line_1');
    expect(map.removeSource).toHaveBeenCalled(); // plugin cleanup
  });
});

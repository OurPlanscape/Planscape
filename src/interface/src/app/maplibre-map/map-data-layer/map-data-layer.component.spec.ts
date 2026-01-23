import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockBuilder, MockRender } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigState } from '../map-config.state';
import { MockMapLibreMap } from 'src/testing/maplibre-gl.mock';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let fixture: any;
  let mockMap: MockMapLibreMap;

  beforeEach(() =>
    MockBuilder(MapDataLayerComponent)
      .keep(HttpClientTestingModule)
      .keep(MatSnackBarModule)
      .mock(DataLayersStateService, {
        dataLayerWithUrl$: of(null),
      })
      .mock(MapConfigState, {
        dataLayersOpacity$: of(0.75),
      })
  );

  beforeEach(() => {
    mockMap = new MockMapLibreMap({
      container: document.createElement('div'),
      center: [0, 0],
      zoom: 1,
    });

    fixture = MockRender(MapDataLayerComponent, {
      mapLibreMap: mockMap as any,
    });
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

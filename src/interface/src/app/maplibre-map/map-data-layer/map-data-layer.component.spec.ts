import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockBuilder, MockRender } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigState } from '../map-config.state';
import { createMapLibreMock } from '@testing/maplibre-gl.mock';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;

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
    const mockMap = createMapLibreMock();
    const fixture = MockRender(MapDataLayerComponent, {
      mapLibreMap: mockMap as any,
    });
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

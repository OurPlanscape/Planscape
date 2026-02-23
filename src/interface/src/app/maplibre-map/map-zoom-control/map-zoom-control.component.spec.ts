import { MapConfigState } from '../map-config.state';
import { MapZoomControlComponent } from './map-zoom-control.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { createMapLibreMock } from '@testing/maplibre-gl.mock';

describe('MapZoomControlComponent', () => {
  let component: MapZoomControlComponent;
  let fixture: any;

  beforeEach(() => MockBuilder(MapZoomControlComponent).mock(MapConfigState));

  beforeEach(() => {
    const mockMap = createMapLibreMock();

    // Pass mapLibreMap as input to ensure it's set before ngOnInit
    fixture = MockRender(MapZoomControlComponent, {
      mapLibreMap: mockMap as any,
    });
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

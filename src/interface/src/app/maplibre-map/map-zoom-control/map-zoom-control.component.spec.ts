import { MapConfigState } from '../map-config.state';
import { MapZoomControlComponent } from './map-zoom-control.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { MockMapLibreMap } from 'src/testing/maplibre-gl.mock';

describe('MapZoomControlComponent', () => {
  let component: MapZoomControlComponent;
  let fixture: any;
  let mockMap: MockMapLibreMap;

  beforeEach(() => MockBuilder(MapZoomControlComponent).mock(MapConfigState));

  beforeEach(() => {
    mockMap = new MockMapLibreMap({
      container: document.createElement('div'),
      center: [0, 0],
      zoom: 1,
    });

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

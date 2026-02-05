import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from '../map-config.state';
import { MapZoomControlComponent } from './map-zoom-control.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { Map as MapLibreMap } from 'maplibre-gl';

describe('MapZoomControlComponent', () => {
  let component: MapZoomControlComponent;
  let fixture: ComponentFixture<MapZoomControlComponent>;
  let mapLibreMap: MapLibreMap;

  beforeEach(async () => {
    mapLibreMap = new MapLibreMap({
      container: document.createElement('div'),
      center: [0, 0],
      zoom: 1,
    });

    await TestBed.configureTestingModule({
      imports: [MapZoomControlComponent],
      providers: [MockProvider(MapConfigState)],
      declarations: MockDeclarations(ControlComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapZoomControlComponent);
    component = fixture.componentInstance;
    component.mapLibreMap = mapLibreMap; // Assign the mock map

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

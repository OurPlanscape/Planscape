import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';
import { Map as MapLibreMap } from 'maplibre-gl';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let fixture: ComponentFixture<MapDataLayerComponent>;
  let mapLibreMap: MapLibreMap;

  beforeEach(async () => {
    mapLibreMap = new MapLibreMap({
      container: document.createElement('div'),
      center: [0, 0],
      zoom: 1,
    });

    await TestBed.configureTestingModule({
      imports: [MapDataLayerComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDataLayerComponent);
    component = fixture.componentInstance;
    component.mapLibreMap = mapLibreMap; // Assign the mock map

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

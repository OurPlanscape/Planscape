import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';
import {
  LayerComponent,
  RasterSourceComponent,
  MapService
} from '@maplibre/ngx-maplibre-gl';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let fixture: ComponentFixture<MapDataLayerComponent>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LayerComponent,
        RasterSourceComponent,
        HttpClientTestingModule,
        MapDataLayerComponent
      ],
      providers: [MapService]
    }).compileComponents();

    fixture = TestBed.createComponent(MapDataLayerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

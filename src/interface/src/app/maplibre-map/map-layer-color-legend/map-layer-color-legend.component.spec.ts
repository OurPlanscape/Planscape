import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapService } from '@maplibre/ngx-maplibre-gl';
import { MapLayerColorLegendComponent } from './map-layer-color-legend.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MapLayerColorLegendComponent', () => {
  let component: MapLayerColorLegendComponent;
  let fixture: ComponentFixture<MapLayerColorLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapLayerColorLegendComponent],
      providers: [MapService],
    }).compileComponents();

    fixture = TestBed.createComponent(MapLayerColorLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

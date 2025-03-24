import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapService } from '@maplibre/ngx-maplibre-gl';
import { MapLayerColorLegendComponent } from './map-layer-color-legend.component';

describe('MapLayerColorLegendComponent', () => {
  let component: MapLayerColorLegendComponent;
  let fixture: ComponentFixture<MapLayerColorLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLayerColorLegendComponent],
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

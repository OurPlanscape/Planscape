import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapService } from '@maplibre/ngx-maplibre-gl';
import { MapLayerColorLegendComponent } from '@app/maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

describe('MapLayerColorLegendComponent', () => {
  let component: MapLayerColorLegendComponent;
  let fixture: ComponentFixture<MapLayerColorLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapLayerColorLegendComponent],
      providers: [
        MapService,
        MockProvider(DataLayersStateService, {
          colorLegendInfo$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapLayerColorLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

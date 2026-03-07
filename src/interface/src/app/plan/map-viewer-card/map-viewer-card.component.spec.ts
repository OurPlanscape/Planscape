import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapViewerCardComponent } from './map-viewer-card.component';
import { Map } from 'maplibre-gl';
import { AuthService } from '@services';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { MockProviders } from 'ng-mocks';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MapViewerCardComponent', () => {
  let component: MapViewerCardComponent;
  let fixture: ComponentFixture<MapViewerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapViewerCardComponent],
      providers: [MockProviders(MapConfigService, AuthService)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapViewerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set mapLibreMap on map load', () => {
    const mockMap = {} as Map;
    component.onMapLoad(mockMap);
    expect(component.mapLibreMap).toBe(mockMap);
  });
});

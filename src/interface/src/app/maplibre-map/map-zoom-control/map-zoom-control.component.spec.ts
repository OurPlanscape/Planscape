import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { MapZoomControlComponent } from './map-zoom-control.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';

describe('MapZoomControlComponent', () => {
  let component: MapZoomControlComponent;
  let fixture: ComponentFixture<MapZoomControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapZoomControlComponent],
      providers: [MockProvider(MapConfigState)],
      declarations: MockDeclarations(ControlComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapZoomControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

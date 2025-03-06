import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { MapNavbarComponent } from './map-nav-bar.component';
import { MockProvider } from 'ng-mocks';

describe('MapNavbarComponent', () => {
  let component: MapNavbarComponent;
  let fixture: ComponentFixture<MapNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapNavbarComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapBaseLayerComponent } from './map-base-layer.component';
import { MockProviders } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

describe('MapBaseLayerComponent', () => {
  let component: MapBaseLayerComponent;
  let fixture: ComponentFixture<MapBaseLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayerComponent],
      providers: [MockProviders(MapConfigState, SelectedStandsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseLayerComponent } from './map-base-layer.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('MapBaseLayerComponent', () => {
  let component: MapBaseLayerComponent;
  let fixture: ComponentFixture<MapBaseLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseLayerComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

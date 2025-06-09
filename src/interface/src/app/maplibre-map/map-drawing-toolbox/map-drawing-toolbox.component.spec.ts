import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';

import { MapDrawingToolboxComponent } from './map-drawing-toolbox.component';
import { MockProvider } from 'ng-mocks';

describe('MapDrawingToolboxComponent', () => {
  let component: MapDrawingToolboxComponent;
  let fixture: ComponentFixture<MapDrawingToolboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [MockProvider(MapConfigState)],
      imports: [MapDrawingToolboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDrawingToolboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

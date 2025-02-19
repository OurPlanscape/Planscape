import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapControlsComponent } from './map-controls.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';

describe('MapControlsComponent', () => {
  let component: MapControlsComponent;
  let fixture: ComponentFixture<MapControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapControlsComponent],
      providers: [MockProviders(MapConfigState)],
      declarations: MockDeclarations(ControlComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

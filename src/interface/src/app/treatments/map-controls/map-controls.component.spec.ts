import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapControlsComponent } from './map-controls.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { MockProviders } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('MapControlsComponent', () => {
  let component: MapControlsComponent;
  let fixture: ComponentFixture<MapControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapControlsComponent],
      providers: [MockProviders(MapConfigState, SelectedStandsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

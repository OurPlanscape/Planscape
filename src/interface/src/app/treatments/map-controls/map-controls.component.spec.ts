import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapControlsComponent } from './map-controls.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

describe('MapControlsComponent', () => {
  let component: MapControlsComponent;
  let fixture: ComponentFixture<MapControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapControlsComponent],
      providers: [SelectedStandsState],
    }).compileComponents();

    fixture = TestBed.createComponent(MapControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapBaseDropdownComponent } from './map-base-dropdown.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from 'src/app/treatments/treatment-map/map-config.state';

describe('MapBaseDropdownComponent', () => {
  let component: MapBaseDropdownComponent;
  let fixture: ComponentFixture<MapBaseDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBaseDropdownComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBaseDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

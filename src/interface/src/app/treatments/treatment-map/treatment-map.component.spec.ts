import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentMapComponent } from './treatment-map.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from './map-config.state';

describe('TreatmentMapComponent', () => {
  let component: TreatmentMapComponent;
  let fixture: ComponentFixture<TreatmentMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentMapComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

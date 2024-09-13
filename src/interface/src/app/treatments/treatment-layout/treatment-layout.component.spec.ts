import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentLayoutComponent } from './treatment-layout.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';

describe('TreatmentLayoutComponent', () => {
  let component: TreatmentLayoutComponent;
  let fixture: ComponentFixture<TreatmentLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentLayoutComponent],
      providers: [MockProvider(TreatmentsState)],
      declarations: [MockDeclarations(TreatmentMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

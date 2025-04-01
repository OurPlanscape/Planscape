import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPrescriptionComponent } from './treatment-prescription.component';

describe('TreatmentPrescriptionComponent', () => {
  let component: TreatmentPrescriptionComponent;
  let fixture: ComponentFixture<TreatmentPrescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentPrescriptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPrescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

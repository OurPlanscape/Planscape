import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentTargetStepComponent } from './treatment-target-step.component';

describe('TreatmentTargetStepComponent', () => {
  let component: TreatmentTargetStepComponent;
  let fixture: ComponentFixture<TreatmentTargetStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentTargetStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentTargetStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

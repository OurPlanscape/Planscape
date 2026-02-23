import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentGoalStepComponent } from './treatment-goal-step.component';

describe('TreatmentGoalStepComponent', () => {
  let component: TreatmentGoalStepComponent;
  let fixture: ComponentFixture<TreatmentGoalStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentGoalStepComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentGoalStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

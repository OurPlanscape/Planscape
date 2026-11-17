import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepDirective } from '@styleguide';

import { ImprovedTreatmentGoalStepComponent } from './improved-treatment-goal-step.component';

describe('ImprovedTreatmentGoalStepComponent', () => {
  let component: ImprovedTreatmentGoalStepComponent;
  let fixture: ComponentFixture<ImprovedTreatmentGoalStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImprovedTreatmentGoalStepComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImprovedTreatmentGoalStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // sg-step reads the form and the data off whatever StepDirective is
  // projected into it, so the stepper only works when we answer for one.
  it('stands in as the step logic of the step it sits in', () => {
    expect(fixture.debugElement.injector.get(StepDirective)).toBe(component);
  });

  it('holds the step back until a treatment goal is picked', () => {
    expect(component.form.valid).toBeFalse();

    component.form.controls.treatment_goal.setValue(7);

    expect(component.form.valid).toBeTrue();
    expect(component.getData()).toEqual({ treatment_goal: 7 });
  });
});

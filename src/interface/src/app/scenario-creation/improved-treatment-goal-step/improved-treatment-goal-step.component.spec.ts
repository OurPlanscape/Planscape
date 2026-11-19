import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockComponent, MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { StepDirective } from '@styleguide';
import { ScenarioV3Config } from '@types';

import { ImprovedTreatmentGoalStepComponent } from './improved-treatment-goal-step.component';
import { NewScenarioState } from '../new-scenario.state';
import { ScenarioSummaryComponent } from '../scenario-summary/scenario-summary.component';
import { ImprovedTreatmentGoalSelectorComponent } from '../improved-treatment-goal-selector/improved-treatment-goal-selector.component';

describe('ImprovedTreatmentGoalStepComponent', () => {
  let component: ImprovedTreatmentGoalStepComponent;
  let fixture: ComponentFixture<ImprovedTreatmentGoalStepComponent>;
  let scenarioConfig$: BehaviorSubject<Partial<ScenarioV3Config>>;

  function stepOverview() {
    return fixture.debugElement.query(By.css('app-scenario-summary'))
      .componentInstance as ScenarioSummaryComponent;
  }

  beforeEach(async () => {
    scenarioConfig$ = new BehaviorSubject<Partial<ScenarioV3Config>>({});

    await TestBed.configureTestingModule({
      imports: [ImprovedTreatmentGoalStepComponent],
      providers: [MockProvider(NewScenarioState, { scenarioConfig$ })],
    })
      .overrideComponent(ImprovedTreatmentGoalStepComponent, {
        remove: {
          imports: [
            ImprovedTreatmentGoalSelectorComponent,
            ScenarioSummaryComponent,
          ],
        },
        add: {
          imports: [
            MockComponent(ImprovedTreatmentGoalSelectorComponent),
            MockComponent(ScenarioSummaryComponent),
          ],
        },
      })
      .compileComponents();

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

  it('hands the step control to the selector', () => {
    const selector = fixture.debugElement.query(
      By.css('app-improved-treatment-goal-selector')
    ).componentInstance as ImprovedTreatmentGoalSelectorComponent;

    expect(selector.control).toBe(component.form.controls.treatment_goal);
  });

  describe('the step overview', () => {
    it('shows what the steps before this one settled', () => {
      scenarioConfig$.next({
        planning_approach: 'PRIORITIZE_SUB_UNITS',
        stand_size: 'LARGE',
      });
      fixture.detectChanges();

      expect(stepOverview().planningApproach).toBe('PRIORITIZE_SUB_UNITS');
      expect(stepOverview().standSize).toBe('LARGE');
    });

    it('says nothing while the draft is still empty', () => {
      expect(stepOverview().planningApproach).toBeUndefined();
      expect(stepOverview().standSize).toBeNull();
    });

    it('leaves out the rows this step has not reached yet', () => {
      expect(stepOverview().treatmentGoal).toBeUndefined();
      expect(stepOverview().priorityObjectives).toBeUndefined();
    });
  });
});

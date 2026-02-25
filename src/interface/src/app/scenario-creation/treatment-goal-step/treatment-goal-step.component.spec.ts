import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TreatmentGoalStepComponent } from './treatment-goal-step.component';
import { TreatmentGoalsService } from '@services';
import { NewScenarioState } from '../new-scenario.state';

describe('TreatmentGoalStepComponent', () => {
  let component: TreatmentGoalStepComponent;
  let fixture: ComponentFixture<TreatmentGoalStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentGoalStepComponent,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => of([]),
        }),
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
          currentStep$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentGoalStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

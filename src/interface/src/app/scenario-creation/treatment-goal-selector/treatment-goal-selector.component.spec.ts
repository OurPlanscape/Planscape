import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';

import { TreatmentGoalSelectorComponent } from './treatment-goal-selector.component';
import { TreatmentGoalsService } from '@services';
import { NewScenarioState } from '../new-scenario.state';
import { ScenarioGoal } from '@app/types';
import { FormControl } from '@angular/forms';

describe('TreatmentGoalSelectorComponent', () => {
  let component: TreatmentGoalSelectorComponent;
  let fixture: ComponentFixture<TreatmentGoalSelectorComponent>;
  const configSubject = new BehaviorSubject<any>({});
  const goalsSubject = new BehaviorSubject<ScenarioGoal[]>([]);

  const mockGoals = [
    {
      id: 1,
      name: 'Goal 1',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
    {
      id: 201,
      name: 'Goal 201',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
    {
      id: 1234,
      name: 'Goal 1234',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
    {
      id: 1556,
      name: 'Goal 1556',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
    {
      id: 2678,
      name: 'Goal 2678',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
    {
      id: 9011,
      name: 'Goal 9011',
      description: 'ok',
      priorities: [''],
      category: '',
      category_text: '',
      group: '',
      group_text: '',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentGoalSelectorComponent,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => goalsSubject.asObservable(),
        }),
        MockProvider(NewScenarioState, {
          scenarioConfig$: configSubject.asObservable(),
          currentStep$: of(null),
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TreatmentGoalSelectorComponent);
    component = fixture.componentInstance;
    component.control = new FormControl<number | null>(null);
  });

  it('should set mappableGoal to true when the goal exists in the fetched list', fakeAsync(() => {
    goalsSubject.next(mockGoals);
    configSubject.next({ treatment_goal: 201 });
    component.ngOnInit();
    tick();
    fixture.detectChanges();
    expect(component.mappableGoal).toBeTrue();
    expect(component.control.value).toBe(201);
  }));

  it('should set mappableGoal to false when the goal is missing from the list', fakeAsync(() => {
    goalsSubject.next(mockGoals);
    configSubject.next({ treatment_goal: 999 });
    component.ngOnInit();
    tick();
    fixture.detectChanges();
    expect(component.mappableGoal).toBeFalse();
  }));

  it('should not trigger the mapping warning if treatment_goal is missing', fakeAsync(() => {
    component.mappableGoal = true;
    goalsSubject.next(mockGoals);
    configSubject.next({});
    component.ngOnInit();
    tick();
    expect(component.mappableGoal).toBeTrue();
  }));
});

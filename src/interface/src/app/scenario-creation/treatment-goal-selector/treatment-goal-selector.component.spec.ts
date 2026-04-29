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
import { TreatmentGoalsService } from '@api/treatment-goals/treatment-goals.service';
import { NewScenarioState } from '../new-scenario.state';
import { TreatmentGoal } from '@api/planscapeAPI.schemas';
import { FormControl } from '@angular/forms';

describe('TreatmentGoalSelectorComponent', () => {
  let component: TreatmentGoalSelectorComponent;
  let fixture: ComponentFixture<TreatmentGoalSelectorComponent>;
  const configSubject = new BehaviorSubject<any>({});
  const goalsSubject = new BehaviorSubject<TreatmentGoal[]>([]);

  const mockGoal = (id: number, name: string): TreatmentGoal => ({
    id,
    name,
    description: 'ok',
    category: null,
    category_text: '',
    group: null,
    group_text: '',
    usage_types: [],
  });

  const mockGoals: TreatmentGoal[] = [
    mockGoal(1, 'Goal 1'),
    mockGoal(201, 'Goal 201'),
    mockGoal(1234, 'Goal 1234'),
    mockGoal(1556, 'Goal 1556'),
    mockGoal(2678, 'Goal 2678'),
    mockGoal(9011, 'Goal 9011'),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentGoalSelectorComponent,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(TreatmentGoalsService),
        MockProvider(NewScenarioState, {
          scenarioConfig$: configSubject.asObservable(),
          currentStep$: of(null),
        }),
      ],
    }).compileComponents();
    spyOn(TestBed.inject(TreatmentGoalsService), 'treatmentGoalsList').and.returnValue(goalsSubject.asObservable() as any);
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { SharedModule } from '@shared';
import {
  Scenario,
  ScenarioGoal,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';
import { TreatmentGoalsService } from '@services';
import { SetPrioritiesComponent } from './set-priorities.component';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { ScenarioState } from '../../../scenario/scenario.state';
import { SectionComponent } from '@styleguide';

@Component({ selector: 'app-scenario-tooltip', template: '' })
class ScenarioTooltipMockComponent {}

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;
  let treatmentGoals$: BehaviorSubject<TreatmentGoalConfig[] | null>;

  const defaultSelectedQuestion: TreatmentQuestionConfig = {
    short_question_text: '',
    scenario_output_fields_paths: {},
    scenario_priorities: [''],
    global_thresholds: [''],
    stand_thresholds: [''],
    weights: [0],
  };
  const testQuestion: TreatmentQuestionConfig = {
    id: 1,
    short_question_text: 'test_question',
    scenario_priorities: ['test_priority'],
    scenario_output_fields_paths: {},
    global_thresholds: [''],
    stand_thresholds: [''],
    weights: [1],
  };

  beforeEach(async () => {
    treatmentGoals$ = new BehaviorSubject<TreatmentGoalConfig[] | null>([
      { category_name: 'test category', questions: [testQuestion] },
    ]);

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        LegacyMaterialModule,
        ReactiveFormsModule,
        SharedModule,
        SectionComponent,
      ],
      declarations: [SetPrioritiesComponent, ScenarioTooltipMockComponent],
      providers: [
        FormBuilder,
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => treatmentGoals$ as any,
        }),
        MockProvider(ScenarioState, {
          currentScenario$: of({} as Scenario),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetPrioritiesComponent);
    component = fixture.componentInstance;

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.goalsForm = fb.group({
      selectedQuestion: [defaultSelectedQuestion],
    });
    component.createForm();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call goalOverlayService.setStateWideGoal if form is enabled', () => {
    const goal = { id: 1 } as ScenarioGoal;
    const spy = spyOn(component['goalOverlayService'], 'setStateWideGoal');

    component.goalsForm.enable();
    component.selectStatewideGoal(goal);

    expect(spy).toHaveBeenCalledWith(goal);
  });

  it('should NOT call goalOverlayService.setStateWideGoal if form is disabled', () => {
    const goal = { id: 1 } as ScenarioGoal;
    const spy = spyOn(component['goalOverlayService'], 'setStateWideGoal');

    component.goalsForm.disable();
    component.selectStatewideGoal(goal);

    expect(spy).not.toHaveBeenCalled();
  });
});

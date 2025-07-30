import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { SharedModule } from '@shared';
import {
  ScenarioGoal,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';
import { TreatmentGoalsService } from '@services';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { TreatmentGoalsComponent } from './treatment-goals.component';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { MOCK_SCENARIO } from '@services/mocks';

@Component({ selector: 'app-scenario-tooltip', template: '' })
class ScenarioTooltipMockComponent {}

describe('TreatmentGoalsComponent', () => {
  let component: TreatmentGoalsComponent;
  let fixture: ComponentFixture<TreatmentGoalsComponent>;
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
        TreatmentGoalsComponent,
      ],
      declarations: [ScenarioTooltipMockComponent],
      providers: [
        FormBuilder,
        MockProvider(ScenarioState, {
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
        }),
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => treatmentGoals$ as any,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentGoalsComponent);
    component = fixture.componentInstance;

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.form = fb.group({
      selectedQuestion: [defaultSelectedQuestion],
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call goalOverlayService.setStateWideGoal if form is enabled', () => {
    const goal = { id: 1 } as ScenarioGoal;
    const spy = spyOn(component['goalOverlayService'], 'setStateWideGoal');

    component.form.enable();
    component.selectStatewideGoal(goal);

    expect(spy).toHaveBeenCalledWith(goal);
  });

  it('should NOT call goalOverlayService.setStateWideGoal if form is disabled', () => {
    const goal = { id: 1 } as ScenarioGoal;
    const spy = spyOn(component['goalOverlayService'], 'setStateWideGoal');

    component.form.disable();
    component.selectStatewideGoal(goal);

    expect(spy).not.toHaveBeenCalled();
  });
});

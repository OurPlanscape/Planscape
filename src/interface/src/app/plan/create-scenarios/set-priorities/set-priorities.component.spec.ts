import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { SharedModule } from '@shared';
import {
  ColormapConfig,
  ConditionsConfig,
  Scenario,
  ScenarioGoal,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';

import {
  LegacyPlanStateService,
  MapService,
  TreatmentGoalsService,
} from '@services';
import { SetPrioritiesComponent } from './set-priorities.component';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { ScenarioState } from '../../../maplibre-map/scenario.state';

@Component({ selector: 'app-scenario-tooltip', template: '' })
class ScenarioTooltipMockComponent {}

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;
  let treatmentGoals$: BehaviorSubject<TreatmentGoalConfig[] | null>;
  let fakeMapService: MapService;

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

  const fakeColormapConfig: ColormapConfig = {
    name: 'fakecolormap',
    values: [
      {
        rgb: '#000000',
        name: 'fakelabel',
      },
    ],
  };

  beforeEach(async () => {
    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getColormap: of(fakeColormapConfig),
      },
      {
        conditionsConfig$: new BehaviorSubject<ConditionsConfig | null>({
          pillars: [
            {
              pillar_name: 'test_pillar_1',
              filepath: 'test_pillar_1',
              display: true,
              elements: [
                {
                  display: true,
                  element_name: 'test_element_1',
                  filepath: 'test_element_1',
                  metrics: [
                    {
                      metric_name: 'test_metric_1',
                      filepath: 'test_metric_1',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      }
    );

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
      ],
      declarations: [SetPrioritiesComponent, ScenarioTooltipMockComponent],
      providers: [
        FormBuilder,
        {
          provide: MapService,
          useValue: fakeMapService,
        },
        MockProvider(LegacyPlanStateService, {
          treatmentGoalsConfig$: treatmentGoals$,
        }),
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

  it('should populate datasource', () => {
    const metric = {
      conditionName: 'test_metric_1',
      displayName: undefined,
      filepath: 'test_metric_1_normalized',
      children: [],
      level: 2,
      hidden: true,
    };
    const element = {
      conditionName: 'test_element_1',
      displayName: undefined,
      filepath: 'test_element_1_normalized',
      children: [metric],
      level: 1,
      expanded: false,
      hidden: true,
    };
    const pillar = {
      conditionName: 'test_pillar_1',
      displayName: undefined,
      filepath: 'test_pillar_1_normalized',
      children: [element],
      level: 0,
      expanded: false,
    };
    expect(component.datasource.data).toEqual([pillar, element, metric]);
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

  it('should set _treatmentGoals and call setFormData if form has a selected value', () => {
    const mockGoal = { id: 1 } as TreatmentQuestionConfig;
    const mockTreatmentGoals = [
      { category_name: 'test category', questions: [mockGoal] },
    ];
    component.goalsForm.get('selectedQuestion')?.setValue(mockGoal);
    const spy = spyOn(component, 'setFormData');
    component.treatmentGoals$.subscribe();
    (
      TestBed.inject(LegacyPlanStateService)
        .treatmentGoalsConfig$ as BehaviorSubject<any>
    ).next(mockTreatmentGoals);

    expect(component['_treatmentGoals']).toEqual(mockTreatmentGoals);
    expect(spy).toHaveBeenCalledWith(mockGoal);
  });

  describe('setting values', () => {
    it('should set the value of the form with setFormData', async () => {
      component['_treatmentGoals'] = [
        { category_name: 'test category', questions: [testQuestion] },
      ];

      component.setFormData(testQuestion);

      expect(component.goalsForm.get('selectedQuestion')?.value).toEqual(
        testQuestion
      );
      expect(component.goalsForm.disabled).toBeTrue();
    });

    it('should set the value of the form again if treatment goals emits a change', () => {
      const setFormDataSpy = spyOn(component, 'setFormData').and.callThrough();

      component.goalsForm.get('selectedQuestion')?.setValue(testQuestion);

      component.treatmentGoals$.subscribe();

      treatmentGoals$.next([
        { category_name: 'test category', questions: [testQuestion] },
      ]);

      expect(setFormDataSpy).toHaveBeenCalledWith(testQuestion);
    });
  });
});

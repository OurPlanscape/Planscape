import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyRadioGroupHarness as MatRadioGroupHarness } from '@angular/material/legacy-radio/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { SharedModule } from '@shared';
import {
  ColormapConfig,
  ConditionsConfig,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';

import { MapService, PlanStateService } from '@services';
import { SetPrioritiesComponent } from './set-priorities.component';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';

@Component({ selector: 'app-scenario-tooltip', template: '' })
class ScenarioTooltipMockComponent {}

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;
  let loader: HarnessLoader;
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
        MaterialModule,
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
        MockProvider(PlanStateService, {
          treatmentGoalsConfig$: treatmentGoals$,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetPrioritiesComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

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

  it('selecting a priority should update the form value', async () => {
    const radioButtonGroup = await loader.getHarness(
      MatRadioGroupHarness.with({ name: 'treatmentGoalSelect' })
    );
    let checked = await radioButtonGroup.getCheckedValue();
    expect(checked).toBe(null);
    // Act: select the test treatment question
    await radioButtonGroup.checkRadioButton({
      label: testQuestion['short_question_text'],
    });

    expect(component.goalsForm?.get('selectedQuestion')?.value).toEqual(
      testQuestion
    );
    checked = await radioButtonGroup.getCheckedValue();
    expect(checked).toBe(testQuestion.toString());
  });

  describe('setting values', () => {
    it('should set the value of the form with setFormData', async () => {
      const radioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'treatmentGoalSelect' })
      );
      component.setFormData(testQuestion);
      // Act: select the test treatment question
      await radioButtonGroup.checkRadioButton({
        label: testQuestion['short_question_text'],
      });

      expect(component.goalsForm?.get('selectedQuestion')?.value).toEqual(
        testQuestion
      );
      let checked = await radioButtonGroup.getCheckedValue();
      expect(checked).toBe(testQuestion.toString());
    });

    it('should set the value of the form again if treatment goals emits a change', async () => {
      const radioButtonGroup = await loader.getHarness(
        MatRadioGroupHarness.with({ name: 'treatmentGoalSelect' })
      );
      component.setFormData(testQuestion);
      // Act: select the test treatment question
      await radioButtonGroup.checkRadioButton({
        label: testQuestion['short_question_text'],
      });
      // form should be checked.
      let checked = await radioButtonGroup.getCheckedValue();
      expect(checked).toBe(testQuestion.toString());

      const question: TreatmentQuestionConfig = {
        ...{ ...testQuestion, ...{ id: 2 } },
        ...{ short_question_text: 'asdas' },
      };
      // different treatment goals
      treatmentGoals$.next([
        { category_name: 'test category', questions: [question] },
      ]);

      // form should NOT be checked - treatment goals are different
      checked = await radioButtonGroup.getCheckedValue();
      expect(checked).toBe(null);

      // same as original but a shallow copy
      treatmentGoals$.next([
        { category_name: 'test category', questions: [{ ...testQuestion }] },
      ]);

      // form should be checked - treatment goals are now the same
      checked = await radioButtonGroup.getCheckedValue();
      expect(checked).toBe(testQuestion.toString());
    });
  });
});

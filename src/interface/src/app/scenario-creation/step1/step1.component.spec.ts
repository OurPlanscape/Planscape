import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { SharedModule } from '@shared';
import { TreatmentGoalsService } from '@services';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { ScenarioState } from '@scenario/scenario.state';
import { MOCK_SCENARIO } from '@services/mocks';
import { Step1Component } from './step1.component';
import { STAND_SIZE } from '@plan/plan-helpers';
import { ActivatedRoute } from '@angular/router';
import { NewScenarioState } from '../new-scenario.state';

@Component({ selector: 'app-scenario-tooltip', template: '' })
class ScenarioTooltipMockComponent {}

describe('Step1Component', () => {
  let component: Step1Component;
  let fixture: ComponentFixture<Step1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        LegacyMaterialModule,
        ReactiveFormsModule,
        SharedModule,
        Step1Component,
      ],
      declarations: [ScenarioTooltipMockComponent],
      providers: [
        FormBuilder,
        MockProvider(ScenarioState, {
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
        }),
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => of([] as any),
        }),
        MockProvider(ActivatedRoute, {
          snapshot: {
            data: {
              planId: 24,
            },
          } as any,
        }),
        MockProvider(NewScenarioState, {
          scenarioConfig$: new BehaviorSubject({}),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1Component);
    component = fixture.componentInstance;

    component.form = new FormGroup({
      stand_size: new FormControl<STAND_SIZE | undefined>(undefined),
      treatment_goal: new FormControl<number | undefined>(undefined),
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

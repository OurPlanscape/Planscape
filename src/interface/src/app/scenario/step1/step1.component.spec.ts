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
import { ScenarioGoal } from '@types';
import { TreatmentGoalsService } from '@services';
import { Component } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { ScenarioState } from 'src/app/scenario/scenario.state';
import { MOCK_SCENARIO } from '@services/mocks';
import { Step1Component } from './step1.component';

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1Component);
    component = fixture.componentInstance;

    component.form = new FormGroup({
      configuration: new FormGroup({
        stand_size: new FormControl(null),
      }),
      treatment_goal: new FormControl(null),
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

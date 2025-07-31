import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { SharedModule } from '@shared';
import { ScenarioGoal } from '@types';
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

  beforeEach(async () => {
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
          getTreatmentGoals: () => of([] as any),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentGoalsComponent);
    component = fixture.componentInstance;

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.form = fb.group({
      selectedQuestion: null,
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

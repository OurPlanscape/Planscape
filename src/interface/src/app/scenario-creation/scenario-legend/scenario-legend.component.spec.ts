import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioLegendComponent } from './scenario-legend.component';
import { MockProvider } from 'ng-mocks';
import { PlanState } from '@plan/plan.state';
import { of } from 'rxjs';
import { AvailableStands, Plan } from '@types';
import { NewScenarioState } from '../new-scenario.state';

describe('ScenarioLegendComponent', () => {
  let component: ScenarioLegendComponent;
  let fixture: ComponentFixture<ScenarioLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioLegendComponent],
      providers: [
        MockProvider(PlanState, {
          currentPlan$: of({} as Plan),
        }),
        MockProvider(NewScenarioState, {
          availableStands$: of({} as AvailableStands),
          currentStep$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

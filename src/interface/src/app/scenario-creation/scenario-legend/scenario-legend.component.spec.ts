import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioLegendComponent } from '@app/scenario-creation/scenario-legend/scenario-legend.component';
import { MockProvider } from 'ng-mocks';
import { PlanState } from '@app/plan/plan.state';
import { of } from 'rxjs';
import { AvailableStands, Plan } from '@types';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

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
          stepIndex$: of(0),
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

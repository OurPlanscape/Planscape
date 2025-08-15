import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioLegendComponent } from './scenario-legend.component';
import { MockProvider } from 'ng-mocks';
import { PlanState } from '../../plan/plan.state';
import { of } from 'rxjs';
import { Plan } from '@types';

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

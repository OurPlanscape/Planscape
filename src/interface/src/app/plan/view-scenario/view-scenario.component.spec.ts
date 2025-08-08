import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewScenarioComponent } from './view-scenario.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { PlanState } from '../plan.state';
import { ScenarioState } from '../../scenario/scenario.state';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { of } from 'rxjs';
import { MOCK_SCENARIO } from '@services/mocks';
import { MatTabGroup } from '@angular/material/tabs';
import { ScenarioPendingComponent } from '../scenario-pending/scenario-pending.component';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { Scenario, ScenarioResult } from '@types';

describe('ViewScenarioComponent', () => {
  let component: ViewScenarioComponent;
  let fixture: ComponentFixture<ViewScenarioComponent>;

  const scenario: Scenario = {
    ...MOCK_SCENARIO,
    scenario_result: { status: 'SUCCESS' } as ScenarioResult,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ViewScenarioComponent,
        MockDeclarations(
          MatTabGroup,
          ScenarioPendingComponent,
          DataLayersComponent
        ),
      ],
      imports: [RouterTestingModule],
      providers: [
        MockProviders(PlanState),
        MockProvider(DataLayersStateService, {
          paths$: of([]),
        }),
        MockProvider(ScenarioState, {
          currentScenario$: of(scenario),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

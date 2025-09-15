import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentOpportunityChartComponent } from './treatment-opportunity-chart.component';
import { MOCK_SCENARIO } from '@services/mocks';
import { ScenarioResult } from '@types';

describe('TreatmentOpportunityChartComponent', () => {
  let component: TreatmentOpportunityChartComponent;
  let fixture: ComponentFixture<TreatmentOpportunityChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TreatmentOpportunityChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentOpportunityChartComponent);
    component = fixture.componentInstance;
    const scenario_result = MOCK_SCENARIO.scenario_result as ScenarioResult;
    component.scenarioResult = scenario_result;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

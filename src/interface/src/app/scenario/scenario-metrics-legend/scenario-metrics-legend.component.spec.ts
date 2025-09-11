import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioResult } from '@types';
import { ScenarioMetricsLegendComponent } from './scenario-metrics-legend.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ScenarioMetricsLegendComponent', () => {
  let component: ScenarioMetricsLegendComponent;
  let fixture: ComponentFixture<ScenarioMetricsLegendComponent>;

  const mockScenarioResult: ScenarioResult = {
    status: 'PENDING',
    completed_at: '0',
    result: {
      features: [
        {
          properties: {
            area_acres: 10,
            attainment: { X: 10, Y: 5 },
          },
        },
        {
          properties: {
            area_acres: 20,
            attainment: { X: 20, Y: 10 },
          },
        },
      ] as any,
      type: 'polygon',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ScenarioMetricsLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMetricsLegendComponent);
    component = fixture.componentInstance;
    component.scenarioResult = mockScenarioResult;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

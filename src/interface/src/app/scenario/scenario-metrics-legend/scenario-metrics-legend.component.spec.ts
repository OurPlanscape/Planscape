import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScenarioResult, UsageType } from '@types';
import { ScenarioMetricsLegendComponent } from './scenario-metrics-legend.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from '@features/feature.service';

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
      providers: [MockProvider(FeatureService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioMetricsLegendComponent);
    component = fixture.componentInstance;
    component.scenarioResult = mockScenarioResult;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('splitting the metrics of the run', () => {
    function renderWith(usageTypes: UsageType[]) {
      component.usageTypes = usageTypes;
      component.ngOnInit();
    }

    it('counts a metric as a priority when its layer is one', () => {
      renderWith([
        { usage_type: 'PRIORITY', datalayer: { id: 1, name: 'X' }, weight: 3 },
      ]);

      expect(component.priorities).toEqual(['X']);
      expect(component.cobenefits).toEqual(['Y']);
      expect(component.priorityWeights).toEqual({ X: 3 });
    });

    it('reads a payload that still sends the name on its own', () => {
      renderWith([{ usage_type: 'PRIORITY', datalayer: 'X', weight: 3 }]);

      expect(component.priorities).toEqual(['X']);
      expect(component.cobenefits).toEqual(['Y']);
    });

    it('weighs a priority the run gave no weight evenly', () => {
      renderWith([{ usage_type: 'PRIORITY', datalayer: { id: 1, name: 'X' } }]);

      expect(component.priorityWeights).toEqual({ X: 1 });
    });

    it('leaves every metric a co-benefit when no layer matches', () => {
      renderWith([
        { usage_type: 'PRIORITY', datalayer: { id: 9, name: 'Water' } },
      ]);

      expect(component.priorities).toEqual([]);
      expect(component.cobenefits).toEqual(['X', 'Y']);
    });
  });
});

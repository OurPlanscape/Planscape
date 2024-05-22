import { MetricConfig, ScenarioConfig, ScenarioResult } from '@types';
import { ChartData } from './project-areas-metrics/chart-data';
import { processScenarioResultsToChartData } from './scenario-helpers';

describe('processScenarioResultsToChartData', () => {
  const metrics: MetricConfig[] = [
    {
      metric_name: 'metric1',
      display_name: 'Metric 1',
      data_units: 'units',
      raw_layer: 'layer1',
    },
    {
      metric_name: 'metric2',
      display_name: 'Metric 2',
      data_units: 'units',
      raw_layer: 'layer2',
    },
    {
      metric_name: 'metric3',
      display_name: 'Metric 3',
      data_units: 'units',
      raw_layer: 'layer3',
    },
  ];

  const scenarioConfig: ScenarioConfig = {
    scenario_priorities: ['metric1'],
    scenario_output_fields: ['metric2', 'metric3'],
  };

  const scenarioResults: ScenarioResult = {
    status: 'PENDING',
    completed_at: '0',
    result: {
      type: 'Feature',
      features: [
        {
          properties: { metric1: 10, metric2: 20, metric3: 30 },
          type: 'FeatureCollection',
          features: [],
        },
        {
          properties: { metric1: 15, metric2: 25, metric3: 35 },
          type: 'FeatureCollection',
          features: [],
        },
        {
          properties: { metric1: 20, metric2: 30, metric3: 40 },
          type: 'FeatureCollection',
          features: [],
        },
      ],
    },
  };

  it('should process metrics and return ChartData correctly', () => {
    const expectedOutput: ChartData[] = [
      {
        label: 'Metric 1',
        measurement: 'units',
        key: 'metric1',
        values: [10, 15, 20],
        metric_layer: 'layer1',
        is_primary: true,
      },
      {
        label: 'Metric 2',
        measurement: 'units',
        key: 'metric2',
        values: [20, 25, 30],
        metric_layer: 'layer2',
        is_primary: false,
      },
      {
        label: 'Metric 3',
        measurement: 'units',
        key: 'metric3',
        values: [30, 35, 40],
        metric_layer: 'layer3',
        is_primary: false,
      },
    ];

    const result = processScenarioResultsToChartData(
      metrics,
      scenarioConfig,
      scenarioResults
    );
    expect(result).toEqual(expectedOutput);
  });

  it('should handle empty metrics array', () => {
    const emptyMetrics: MetricConfig[] = [];
    const result = processScenarioResultsToChartData(
      emptyMetrics,
      scenarioConfig,
      scenarioResults
    );
    expect(result).toEqual([]);
  });

  it('should handle empty scenario results', () => {
    const emptyScenarioResults: ScenarioResult = {
      status: 'PENDING',
      completed_at: '0',
      result: {
        features: [],
        type: '',
      },
    };
    const expectedOutput: ChartData[] = [
      {
        label: 'Metric 1',
        measurement: 'units',
        key: 'metric1',
        values: [],
        metric_layer: 'layer1',
        is_primary: true,
      },
      {
        label: 'Metric 2',
        measurement: 'units',
        key: 'metric2',
        values: [],
        metric_layer: 'layer2',
        is_primary: false,
      },
      {
        label: 'Metric 3',
        measurement: 'units',
        key: 'metric3',
        values: [],
        metric_layer: 'layer3',
        is_primary: false,
      },
    ];

    const result = processScenarioResultsToChartData(
      metrics,
      scenarioConfig,
      emptyScenarioResults
    );
    expect(result).toEqual(expectedOutput);
  });

  it('should handle missing priorities and output fields', () => {
    const emptyConfig: ScenarioConfig = {};
    const result = processScenarioResultsToChartData(
      metrics,
      emptyConfig,
      scenarioResults
    );
    expect(result).toEqual([]);
  });
});

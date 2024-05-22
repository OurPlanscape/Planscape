import { MetricConfig, ScenarioConfig, ScenarioResult } from '@types';
import { ChartData } from './project-areas-metrics/chart-data';

export function processScenarioResultsToChartData(
  metrics: MetricConfig[],
  scenarioConfig: ScenarioConfig,
  scenarioResults: ScenarioResult
): ChartData[] {
  const {
    scenario_priorities: priorities = [],
    scenario_output_fields: outputFields = [],
  } = scenarioConfig;
  const relevantFields = new Set([...outputFields, ...priorities]);

  return metrics.reduce((acc: ChartData[], metric) => {
    if (relevantFields.has(metric.metric_name)) {
      const metricData = scenarioResults.result.features.map(
        (featureCollection) => featureCollection.properties[metric.metric_name]
      );

      acc.push({
        label: metric.display_name,
        measurement: metric.data_units,
        key: metric.metric_name,
        values: metricData,
        metric_layer: metric.raw_layer,
        is_primary: priorities.includes(metric.metric_name),
      } as ChartData);
    }
    return acc;
  }, []);
}

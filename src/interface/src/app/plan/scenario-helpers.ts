import { MetricConfig, ScenarioConfig, ScenarioResult } from '@types';
import { ChartData } from './project-areas-metrics/chart-data';

export function processScenarioResultsToChartData(
  metrics: MetricConfig[],
  scenarioConfig: ScenarioConfig,
  scenarioResults: ScenarioResult
): ChartData[] {
  const priorities = scenarioConfig.scenario_priorities;
  const outputFields = new Set([
    ...(scenarioConfig.scenario_output_fields || []),
    ...(priorities || []),
  ]);

  return metrics
    .filter((metric) => outputFields?.has(metric.metric_name))
    .map((metric) => {
      let metricData: number[] = [];
      scenarioResults.result.features.map((featureCollection) => {
        metricData.push(featureCollection.properties[metric.metric_name]);
      });

      return <ChartData>{
        label: metric.display_name,
        measurement: metric.data_units,
        key: metric.metric_name,
        values: metricData,
        metric_layer: metric.raw_layer,
        is_primary: priorities?.includes(metric.metric_name) || false,
      };
    });
}

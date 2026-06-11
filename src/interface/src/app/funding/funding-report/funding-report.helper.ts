import {
  FundingReportDataPoint,
  FundingReportMetric,
  FundingReportResults,
} from '@types';

/**
 * Percentage change after treatment for a year, mirroring the backend's
 * `calculate_percent_delta`. Returns 0 when there is no baseline to compare to.
 */
export function percentDelta(value: number, baseline: number): number {
  return baseline === 0 ? 0 : ((value - baseline) / baseline) * 100;
}

/**
 * Per-year summary for a metric over the chosen project areas, year-sorted.
 *
 * An empty `projectAreas` means "all areas" and returns the precomputed
 * whole-scenario summary as-is. A non-empty list aggregates only those projects
 * the same way the backend builds the summary: sum value & baseline per year,
 * then recompute the percentage delta.
 */
export function aggregateMetricSummary(
  results: FundingReportResults,
  metric: FundingReportMetric,
  projectAreas: number[]
): FundingReportDataPoint[] {
  if (projectAreas.length === 0) {
    return results.summary[metric];
  }
  const selected = new Set(projectAreas);
  const byYear = new Map<number, { value: number; baseline: number }>();
  for (const point of results.projects[metric]) {
    if (!selected.has(point.project_id)) {
      continue;
    }
    const agg = byYear.get(point.year) ?? { value: 0, baseline: 0 };
    agg.value += point.value ?? 0;
    agg.baseline += point.baseline ?? 0;
    byYear.set(point.year, agg);
  }
  return [...byYear.entries()]
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, { value, baseline }]) => ({
      year,
      value,
      baseline,
      delta: percentDelta(value, baseline),
    }));
}

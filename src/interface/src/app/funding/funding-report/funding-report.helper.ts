import {
  FundingReportDataPoint,
  FundingReportMetric,
  FundingReportProjectDataPoint,
  FundingReportResults,
  ORIGIN_TYPE,
} from '@types';

/**
 * The per-project field that selection ids are matched against. USER scenarios
 * select by project area id (`project_id`); SYSTEM scenarios select by the
 * 1-based project index / treatment rank (`proj_id`).
 */
function projectIdKey(
  origin: ORIGIN_TYPE
): keyof Pick<FundingReportProjectDataPoint, 'project_id' | 'proj_id'> {
  return origin === 'SYSTEM' ? 'proj_id' : 'project_id';
}

/**
 * Percentage change after treatment for a year, mirroring the backend's
 * `calculate_percent_delta`. Returns 0 when there is no baseline to compare to.
 */
export function percentDelta(value: number, baseline: number): number {
  return baseline === 0 ? 0 : ((value - baseline) / baseline) * 100;
}

/**
 * Whether a metric has any usable data over the chosen project areas. The
 * backend sends a full list of years with null values when nothing was
 * computed; if every point is null the chart should be hidden.
 *
 * An empty `projectAreas` checks the whole-scenario summary; a non-empty list
 * checks only the selected project areas. `origin` decides which per-project
 * field the selection ids are matched against.
 */
export function hasMetricData(
  results: FundingReportResults,
  metric: FundingReportMetric,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): boolean {
  const idKey = projectIdKey(origin);
  const points =
    projectAreas.length === 0
      ? results.summary[metric]
      : results.projects[metric].filter((point) =>
          projectAreas.includes(point[idKey] as number)
        );
  return points.some((point) => point.value !== null);
}

/**
 * Per-year summary for a metric over the chosen project areas, year-sorted.
 *
 * An empty `projectAreas` means "all areas" and returns the precomputed
 * whole-scenario summary as-is. A non-empty list aggregates only those projects
 * the same way the backend builds the summary: sum value & baseline per year,
 * then recompute the percentage delta. `origin` decides which per-project field
 * the selection ids are matched against.
 */
export function aggregateMetricSummary(
  results: FundingReportResults,
  metric: FundingReportMetric,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): FundingReportDataPoint[] {
  if (projectAreas.length === 0) {
    return results.summary[metric];
  }
  const idKey = projectIdKey(origin);
  const selected = new Set(projectAreas);
  const byYear = new Map<number, { value: number; baseline: number }>();
  for (const point of results.projects[metric]) {
    if (!selected.has(point[idKey] as number)) {
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

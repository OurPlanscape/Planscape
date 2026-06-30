import {
  FlameLengthInterval,
  FundingReportBiomassVolumes,
  FundingReportDataPoint,
  FundingReportProjectDataPoint,
  FundingReportResults,
  FundingReportTimeSeriesMetric,
  ORIGIN_TYPE,
  Scenario,
} from '@types';
import { FundingLegendData } from '../funding-acreage-legend/funding-acreage-legend.component';

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
 * Share of the total area the value represents, mirroring the backend's flame
 * length reduction delta (`reduced_area / total_area * 100`). Unlike the
 * time-series metrics — where `delta` is a percent *change* from baseline —
 * flame length `value` is the reduced acreage and `baseline` is the total area,
 * so the delta is simply what fraction of the area was reduced.
 */
export function percentOfArea(value: number, baseline: number): number {
  return baseline === 0 ? 0 : (value / baseline) * 100;
}

/**
 * Whether the given summary/per-project points carry any usable data over the
 * chosen project areas. The backend sends a full list of years with null values
 * when nothing was computed; if every point is null the chart should be hidden.
 *
 * An empty `projectAreas` checks the whole-scenario summary; a non-empty list
 * checks only the selected project areas. `origin` decides which per-project
 * field the selection ids are matched against.
 */
function pointsHaveData(
  summary: FundingReportDataPoint[],
  projects: FundingReportProjectDataPoint[],
  projectAreas: number[],
  origin: ORIGIN_TYPE
): boolean {
  const idKey = projectIdKey(origin);
  const points =
    projectAreas.length === 0
      ? summary
      : projects.filter((point) =>
          projectAreas.includes(point[idKey] as number)
        );
  return points.some((point) => point.value !== null);
}

/**
 * Per-year summary over the chosen project areas, year-sorted.
 *
 * An empty `projectAreas` means "all areas" and returns the precomputed
 * whole-scenario summary as-is. A non-empty list aggregates only those projects
 * the same way the backend builds the summary: sum value & baseline per year,
 * then recompute the percentage delta. `origin` decides which per-project field
 * the selection ids are matched against.
 */
function aggregateSummary(
  summary: FundingReportDataPoint[],
  projects: FundingReportProjectDataPoint[],
  projectAreas: number[],
  origin: ORIGIN_TYPE,
  computeDelta: (value: number, baseline: number) => number = percentDelta
): FundingReportDataPoint[] {
  if (projectAreas.length === 0) {
    return summary;
  }
  const idKey = projectIdKey(origin);
  const selected = new Set(projectAreas);
  const byYear = new Map<number, { value: number; baseline: number }>();
  for (const point of projects) {
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
      delta: computeDelta(value, baseline),
    }));
}

/** Whether a time-series metric has any usable data; see `pointsHaveData`. */
export function hasMetricData(
  results: FundingReportResults,
  metric: FundingReportTimeSeriesMetric,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): boolean {
  return pointsHaveData(
    results.summary[metric],
    results.projects[metric],
    projectAreas,
    origin
  );
}

/** Per-year summary for a time-series metric; see `aggregateSummary`. */
export function aggregateMetricSummary(
  results: FundingReportResults,
  metric: FundingReportTimeSeriesMetric,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): FundingReportDataPoint[] {
  return aggregateSummary(
    results.summary[metric],
    results.projects[metric],
    projectAreas,
    origin
  );
}

/**
 * Flame length reduction is pre-calculated per interval, so it's shaped as an
 * object keyed by interval rather than a flat array. Pull out the array for the
 * selected interval, tolerating the older array shape from reports run before
 * the multi-interval change.
 */
function flameSummaryPoints(
  results: FundingReportResults,
  interval: FlameLengthInterval
): FundingReportDataPoint[] {
  const flame = results.summary.TOTAL_FLAME_SEVERITY;
  if (Array.isArray(flame)) {
    return flame;
  }
  return flame?.[interval] ?? [];
}

function flameProjectPoints(
  results: FundingReportResults,
  interval: FlameLengthInterval
): FundingReportProjectDataPoint[] {
  const flame = results.projects.TOTAL_FLAME_SEVERITY;
  if (Array.isArray(flame)) {
    return flame;
  }
  return flame?.[interval] ?? [];
}

/** Whether the selected flame length interval has any usable data. */
export function hasFlameLengthData(
  results: FundingReportResults,
  interval: FlameLengthInterval,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): boolean {
  return pointsHaveData(
    flameSummaryPoints(results, interval),
    flameProjectPoints(results, interval),
    projectAreas,
    origin
  );
}

/**
 * Per-year summary for the selected flame length interval. When project areas
 * are selected, the per-year delta is recomputed as the share of total area
 * reduced (`value / baseline * 100`), mirroring the backend's flame length
 * aggregation rather than the time-series percent-change formula.
 */
export function aggregateFlameLengthSummary(
  results: FundingReportResults,
  interval: FlameLengthInterval,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): FundingReportDataPoint[] {
  return aggregateSummary(
    flameSummaryPoints(results, interval),
    flameProjectPoints(results, interval),
    projectAreas,
    origin,
    percentOfArea
  );
}

/**
 * Estimated biomass volumes for the chosen project areas.
 *
 * An empty `projectAreas` means "all areas" and returns the precomputed
 * whole-scenario summary as-is. A non-empty list sums each volume field over
 * the selected project areas, mirroring the backend, which accumulates raw
 * per-area values before the (linear) unit conversion — so summing the
 * already-converted per-area outputs yields the same totals.
 *
 * Returns `undefined` when no biomass data is available for the selection.
 * `origin` decides which per-project field the selection ids are matched against.
 */
export function aggregateBiomassVolumes(
  results: FundingReportResults,
  projectAreas: number[],
  origin: ORIGIN_TYPE
): FundingReportBiomassVolumes | undefined {
  if (projectAreas.length === 0) {
    return results.summary.BIOMASS_VOLUMES;
  }
  const projects = results.projects.BIOMASS_VOLUMES;
  if (!projects) {
    return undefined;
  }
  const idKey = projectIdKey(origin);
  const selected = new Set(projectAreas);
  const matches = projects.filter((project) =>
    selected.has(project[idKey] as number)
  );
  if (matches.length === 0) {
    return undefined;
  }
  const sum = (key: keyof FundingReportBiomassVolumes) =>
    matches.reduce((total, project) => total + (project[key] ?? 0), 0);
  return {
    merchantable_softwood_bf: sum('merchantable_softwood_bf'),
    merchantable_hardwood_bf: sum('merchantable_hardwood_bf'),
    merchantable_mixed_bf: sum('merchantable_mixed_bf'),
    non_merchantable_softwood_cuft: sum('non_merchantable_softwood_cuft'),
    non_merchantable_hardwood_cuft: sum('non_merchantable_hardwood_cuft'),
    non_merchantable_mixed_cuft: sum('non_merchantable_mixed_cuft'),
  };
}

export function generateLegendFromReport(
  results: FundingReportResults | null,
  selectedAreas: number[],
  scenario: Scenario
): FundingLegendData {
  const legendData: FundingLegendData = { totalAcres: 0, selectedAcres: 0 };
  if (!results || !scenario.origin) {
    return { totalAcres: 0, selectedAcres: 0 };
  }
  const txAreas = results?.treatment_areas;
  const idKey = projectIdKey(scenario.origin);
  const features = scenario.scenario_result?.result.features;

  console.log('resulting features are:', features);
  console.log('the selected areas are:', selectedAreas);
  console.log('the report:', results);
  console.log('the key:', idKey);
  console.log('txAreas: ', txAreas);

  const selectedFeatures = features?.filter((f) => {
    if (selectedAreas.length === 0) {
      return f;
    } else {
      return selectedAreas.includes(f.properties[idKey]);
    }
  });
  console.log('selectedFeatures: ', selectedFeatures);

  legendData.totalAcres =
    features?.reduce((sum, f) => {
      return sum + (f.properties['area_acres'] || 0);
    }, 0) ?? 0;

  legendData.selectedAcres =
    selectedFeatures?.reduce((sum, f) => {
      return sum + (f.properties['area_acres'] || 0);
    }, 0) ?? 0;

  //TODO: need a different key for treatment_area.project ids?
  // const selectedTreatmentResults = selectedAreas.map(
  //   (areaId: number) => txAreas?.projects[areaId]
  // );
  console.log('legend data:', legendData);

  return legendData;
}

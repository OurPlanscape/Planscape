import {
  FundingReportBiomassVolumes,
  FundingReportDataPoint,
  FundingReportMetric,
  FundingReportProjectDataPoint,
  FundingReportResults,
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
  const legendData : FundingLegendData = { totalAcres: 0, selectedAcres: 0 };
  if (!results || !scenario.origin) {
    return {totalAcres: 0, selectedAcres: 0};
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

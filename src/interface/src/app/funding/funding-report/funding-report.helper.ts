import {
  FlameLengthInterval,
  FundingReportBiomassVolumes,
  FundingReportDataPoint,
  FundingReportProjectDataPoint,
  FundingReportResults,
  FundingReportTimeSeriesMetric,
  ProjectArea,
} from '@types';
import {
  FundingLegendData,
  LegendTreatmentType,
  TREATMENT_ORDER,
} from '../funding-acreage-legend/funding-acreage-legend.component';

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
  projectAreas: number[]
): boolean {
  const points =
    projectAreas.length === 0
      ? summary
      : projects.filter((point) =>
          projectAreas.includes(point['project_id'] as number)
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
  computeDelta: (value: number, baseline: number) => number = percentDelta
): FundingReportDataPoint[] {
  if (projectAreas.length === 0) {
    return summary;
  }
  const idKey = 'project_id';
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
  projectAreas: number[]
): boolean {
  return pointsHaveData(
    results.summary[metric],
    results.projects[metric],
    projectAreas
  );
}

/** Per-year summary for a time-series metric; see `aggregateSummary`. */
export function aggregateMetricSummary(
  results: FundingReportResults,
  metric: FundingReportTimeSeriesMetric,
  projectAreas: number[]
): FundingReportDataPoint[] {
  return aggregateSummary(
    results.summary[metric],
    results.projects[metric],
    projectAreas
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
  projectAreas: number[]
): boolean {
  return pointsHaveData(
    flameSummaryPoints(results, interval),
    flameProjectPoints(results, interval),
    projectAreas
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
  projectAreas: number[]
): FundingReportDataPoint[] {
  return aggregateSummary(
    flameSummaryPoints(results, interval),
    flameProjectPoints(results, interval),
    projectAreas,
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
  projectAreas: number[]
): FundingReportBiomassVolumes | undefined {
  if (projectAreas.length === 0) {
    return results.summary.BIOMASS_VOLUMES;
  }
  const projects = results.projects.BIOMASS_VOLUMES;
  if (!projects) {
    return undefined;
  }
  const idKey = 'project_id';
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
  projectAreas: ProjectArea[]
): FundingLegendData {
  const legendData: FundingLegendData = { selectedAcres: 0 };
  if (!results) {
    return { selectedAcres: 0 };
  }
  const txAreas = results?.treatment_areas;

  const selectedProjectAreas = projectAreas?.filter((f) => {
    if (selectedAreas.length === 0) {
      return f;
    } else {
      return selectedAreas.includes(f.id);
    }
  });

  legendData.selectedAcres =
    selectedProjectAreas?.reduce((sum, f) => {
      return sum + (f.data.area_acres || 0);
    }, 0) ?? 0;

  // calculate dynamic totals
  const selectedTreatmentResults = selectedProjectAreas.map(
    (area) => txAreas?.projects[area.id]
  );
  legendData.treatmentAcresTotals = calculateTreatmentAcreSums(
    selectedTreatmentResults
  );
  return legendData;
}

export function calculateTreatmentAcreSums(
  selectedTreatmentResults: (Record<string, number | undefined> | undefined)[]
): { treatment: LegendTreatmentType; acres: number }[] {
  const totals: Record<string, number> = {};

  selectedTreatmentResults.forEach((obj) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key] || 0;
        totals[key] = (totals[key] || 0) + value;
      }
    }
  });

  const treatmentAcresSums: {
    treatment: LegendTreatmentType;
    acres: number;
  }[] = [];
  for (const key in totals) {
    if (Object.prototype.hasOwnProperty.call(totals, key)) {
      treatmentAcresSums.push({
        treatment: key as LegendTreatmentType,
        acres: totals[key],
      });
    }
  }

  return treatmentAcresSums.sort(
    (a, b) =>
      TREATMENT_ORDER.indexOf(a.treatment) -
      TREATMENT_ORDER.indexOf(b.treatment)
  );
}

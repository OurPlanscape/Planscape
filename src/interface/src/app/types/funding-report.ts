export interface FundingReportDataPoint {
  year: number;
  // The backend sends null for years/metrics with no valid data.
  delta: number | null;
  value: number | null;
  baseline: number | null;
}

export interface FundingReportProjectDataPoint extends FundingReportDataPoint {
  project_id: number;
  // Present for SYSTEM-origin scenarios, where selection is keyed by the
  // 1-based project index (treatment rank) rather than the project area id.
  // USER-origin scenarios get an explicit null.
  proj_id?: number | null;
}

/** Time-series metrics whose report data is a flat, per-year array. */
export type FundingReportTimeSeriesMetric =
  | 'POTENTIAL_SMOKE'
  | 'ABOVEGROUND_TOTAL';

export type FundingReportMetric =
  | FundingReportTimeSeriesMetric
  | 'TOTAL_FLAME_SEVERITY';

/**
 * AET (water availability) summary block. Lives under `results.summary.AET` in
 * the report, and is also the response of the `aet-improvement` endpoint.
 *
 * Note: the backend also returns a per-project-area AET breakdown
 * (`project_areas`), but the report only ever displays this whole-scenario
 * summary, so the FE deliberately ignores it (it isn't typed or read anywhere).
 */
export interface FundingReportAETSummary {
  /** The target percentage increase the calculation was run for. */
  percentage: number;
  /** Acres with a significant increase in water availability. */
  improved_acres: number;
  total_project_area_acres: number;
  /** Percent of the project area with a significant increase (0-100). */
  improved_area_percent: number;
}

/** Request body for the `aet-improvement` endpoint. */
export interface FundingReportAETImprovementRequest {
  percentage: number;
}

/**
 * Estimated available biomass with no treatment, by wood type. Lives under
 * `results.summary.BIOMASS_VOLUMES` (whole scenario) and, per project area,
 * under `results.projects.BIOMASS_VOLUMES`.
 *
 * Merchantable volumes are board-feet per acre (bf/ac); non-merchantable
 * volumes are cubic-feet per acre (ft³/ac).
 */
export interface FundingReportBiomassVolumes {
  merchantable_softwood_bf: number;
  merchantable_hardwood_bf: number;
  merchantable_mixed_bf: number;
  non_merchantable_softwood_cuft: number;
  non_merchantable_hardwood_cuft: number;
  non_merchantable_mixed_cuft: number;
}

/** Per-project-area biomass volumes; carries the selection key(s). */
export interface FundingReportBiomassVolumesProject
  extends FundingReportBiomassVolumes {
  project_id: number;
  // Present for SYSTEM-origin scenarios, where selection is keyed by the
  // 1-based project index (treatment rank) rather than the project area id.
  proj_id?: number | null;
}

/** Report results, keyed by metric (e.g. POTENTIAL_SMOKE, ABOVEGROUND_TOTAL). */
export interface FundingReportResults {
  /**
   * Whole-scenario totals per metric. The time-series metrics are arrays; the
   * water metric (`AET`) is a single summary object instead.
   */
  summary: Record<FundingReportTimeSeriesMetric, FundingReportDataPoint[]> & {
    // Pre-calculated for every flame length interval; the FE reads the
    // interval the user has selected (see FLAME_LENGTH_INTERVAL_OPTIONS).
    TOTAL_FLAME_SEVERITY?: FlameLengthIntervalSummary;
    AET?: FundingReportAETSummary;
    BIOMASS_VOLUMES?: FundingReportBiomassVolumes;
  };
  /**
   * Same metrics, broken down per project area.
   *
   * AET is intentionally omitted here: the water section always shows the
   * whole-scenario `summary.AET` and is never broken down by project area, so
   * the FE doesn't model or read the per-project AET the backend sends.
   */
  // AET?: FundingReportAETImprovementProjectArea[];
  projects: Record<
    FundingReportTimeSeriesMetric,
    FundingReportProjectDataPoint[]
  > & {
    TOTAL_FLAME_SEVERITY?: FlameLengthIntervalProjects;
    BIOMASS_VOLUMES?: FundingReportBiomassVolumesProject[];
  };

  treatment_areas?: {
    total: Record<string, Record<string, number>>;
    projects: Record<string, Record<string, number>>;
  };
}

// TODO full interface
export interface FundingReport {
  status: 'SUCCESS' | 'PENDING' | 'RUNNING' | 'FAILED';
  created_at: string;
  created_by: number;
  updated_at: string;
  id: number;
  scenario: number;
  results: FundingReportResults | null;
  treatment_datalayer: number | null;
  geopackage_status: null | 'SUCCEEDED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  geopackage_url: null | string;
}

/**
 * Flame length reduction intervals the report pre-calculates. The key encodes
 * the from/to thresholds in feet (e.g. '7_4' is area reduced from >7 ft to
 * <4 ft), matching the backend's interval keys under `TOTAL_FLAME_SEVERITY`.
 */
export type FlameLengthInterval = '7_4' | '6_4' | '4_2';

/** Flame length interval options for the selector, in display order. */
export const FLAME_LENGTH_INTERVAL_OPTIONS: {
  value: FlameLengthInterval;
  label: string;
}[] = [
  { value: '7_4', label: 'Greater than (>) 7 ft to less than (<) 4 ft' },
  { value: '6_4', label: 'Greater than (>) 6 ft to less than (<) 4 ft' },
  { value: '4_2', label: 'Greater than (>) 4 ft to less than (<) 2 ft' },
];

/** Interval shown by default, before the user picks one. */
export const DEFAULT_FLAME_LENGTH_INTERVAL: FlameLengthInterval = '7_4';

/** A per-project flame length data point; carries the 1-based project index too. */
export interface FlameLengthReductionProjectDataPoint
  extends FundingReportProjectDataPoint {
  proj_id: number | null;
}

/**
 * Whole-scenario flame length reduction, keyed by interval. Lives under
 * `results.summary.TOTAL_FLAME_SEVERITY`.
 */
export type FlameLengthIntervalSummary = Partial<
  Record<FlameLengthInterval, FundingReportDataPoint[]>
>;

/**
 * Per-project-area flame length reduction, keyed by interval. Lives under
 * `results.projects.TOTAL_FLAME_SEVERITY`.
 */
export type FlameLengthIntervalProjects = Partial<
  Record<FlameLengthInterval, FlameLengthReductionProjectDataPoint[]>
>;

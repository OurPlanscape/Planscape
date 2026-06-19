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
  proj_id?: number;
}

export type FundingReportMetric =
  | 'POTENTIAL_SMOKE'
  | 'ABOVEGROUND_TOTAL'
  | 'TOTAL_FLAME_SEVERITY';

/** Per-project-area AET (water availability) improvement breakdown. */
export interface FundingReportAETImprovementProjectArea {
  project_id: number;
  improved_acres: number;
  total_acres: number;
  improved_area_percent: number;
}

/**
 * AET (water availability) summary block. Lives under `results.summary.AET` in
 * the report, and is also the whole-scenario portion of the `aet-improvement`
 * endpoint response.
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

/**
 * Full response of the `aet-improvement` endpoint: the summary block plus the
 * per-project-area breakdown for a target percentage increase.
 */
export interface FundingReportAETImprovement extends FundingReportAETSummary {
  project_areas: FundingReportAETImprovementProjectArea[];
}

/** Request body for the `aet-improvement` endpoint. */
export interface FundingReportAETImprovementRequest {
  percentage: number;
}

/** Report results, keyed by metric (e.g. POTENTIAL_SMOKE, ABOVEGROUND_TOTAL). */
export interface FundingReportResults {
  /**
   * Whole-scenario totals per metric. The time-series metrics are arrays; the
   * water metric (`AET`) is a single summary object instead.
   */
  summary: Record<FundingReportMetric, FundingReportDataPoint[]> & {
    AET?: FundingReportAETSummary;
  };
  /** Same metrics, broken down per project area. */
  projects: Record<FundingReportMetric, FundingReportProjectDataPoint[]> & {
    AET?: FundingReportAETImprovementProjectArea[];
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
}

export interface FlameLengthRequestParams {
  from_ft: number;
  to_ft: number;
}

/** A per-project flame length data point; carries the 1-based project index too. */
export interface FlameLengthReductionProjectDataPoint
  extends FundingReportProjectDataPoint {
  proj_id: number;
}

/**
 * Response of the flame-length-reduction endpoint: recomputed
 * `TOTAL_FLAME_SEVERITY` for the whole scenario and per project area.
 */
export interface FlameLengthReductionResponse {
  interval: { from: number; to: number };
  summary: FundingReportDataPoint[];
  projects: FlameLengthReductionProjectDataPoint[];
}

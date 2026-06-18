export interface FundingReportDataPoint {
  year: number;
  // The backend sends null for years/metrics with no valid data.
  delta: number | null;
  value: number | null;
  baseline: number | null;
}

export interface FundingReportProjectDataPoint extends FundingReportDataPoint {
  project_id: number;
}

export type FundingReportMetric =
  | 'POTENTIAL_SMOKE'
  | 'ABOVEGROUND_TOTAL'
  | 'TOTAL_FLAME_SEVERITY';

/** Report results, keyed by metric (e.g. POTENTIAL_SMOKE, ABOVEGROUND_TOTAL). */
export interface FundingReportResults {
  /** Whole-scenario totals per metric. */
  summary: Record<FundingReportMetric, FundingReportDataPoint[]>;
  /** Same metrics, broken down per project area. */
  projects: Record<FundingReportMetric, FundingReportProjectDataPoint[]>;
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

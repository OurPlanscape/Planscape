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
 * Per-project-area AET (water availability) improvement. Lives under
 * `results.projects.AET`, and is also carried in the `project_areas` array of
 * the `aet-improvement` endpoint response. Used to re-aggregate the water
 * figures over the selected project areas, mirroring the charts.
 */
export interface FundingReportAETImprovementProjectArea {
  project_id: number;
  /** Acres in this project area with a significant increase in water availability. */
  improved_acres: number;
  total_acres: number;
  /** Percent of this project area with a significant increase (0-100). */
  improved_area_percent: number;
}

/**
 * AET (water availability) summary block. Lives under `results.summary.AET` in
 * the report, and is also the response of the `aet-improvement` endpoint.
 *
 * `improved_acres` / `improved_area_percent` are the whole-scenario totals (all
 * project areas). To show figures for a selected subset of project areas, the
 * FE re-aggregates from the per-project `results.projects.AET` breakdown — see
 * `aggregateAetSummary`.
 */
export interface FundingReportAETSummary {
  /** The target percentage increase the calculation was run for. */
  percentage: number;
  /** Acres with a significant increase in water availability (whole scenario). */
  improved_acres: number;
  total_project_area_acres: number;
  /**
   * Total acreage of the planning area — the denominator for
   * `improved_area_percent`, unchanged by the project-area selection.
   */
  planning_area_acres: number;
  /** Percent of the planning area with a significant increase (0-100). */
  improved_area_percent: number;
  /**
   * Per-project-area breakdown. Present on the `aet-improvement` endpoint
   * response; the report itself carries the same array under
   * `results.projects.AET` instead.
   */
  project_areas?: FundingReportAETImprovementProjectArea[];
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
   * Same metrics, broken down per project area. The water section re-aggregates
   * `AET` over the selected project areas (see `aggregateAetSummary`).
   */
  projects: Record<
    FundingReportTimeSeriesMetric,
    FundingReportProjectDataPoint[]
  > & {
    TOTAL_FLAME_SEVERITY?: FlameLengthIntervalProjects;
    AET?: FundingReportAETImprovementProjectArea[];
    BIOMASS_VOLUMES?: FundingReportBiomassVolumesProject[];
  };

  treatment_areas?: {
    total: Record<string, Record<string, number>>;
    projects: Record<string, Record<string, number>>;
  };
}

// TODO full interface
export interface FundingReport {
  status: 'SUCCESS' | 'EMPTY' | 'PENDING' | 'RUNNING' | 'FAILED';
  created_at: string;
  created_by: number;
  updated_at: string;
  id: number;
  scenario: number;
  results: FundingReportResults | null;
  treatment_datalayer: number | null;
  /**
   * Id of the "percentage change in water availability after treatment" data
   * layer, produced by the report itself. Shown as the sole layer in the water
   * section (the module's water layers are not used there).
   */
  aet_datalayer: number | null;
  geopackage_status: null | 'SUCCEEDED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  geopackage_url: null | string;
}

/**
 * Response of the funding-report invite endpoints (`funding-report-invites`,
 * GET and POST): the emails the report has already been shared with.
 */
export interface FundingReportInviteEmails {
  emails: string[];
}

/**
 * The report configuration frozen into a shared link (water target + flame
 * interval). Echoed back on the public endpoint so the shared view renders the
 * same selection the sharer picked.
 */
export interface FundingReportSharedConfiguration {
  aet: number;
  total_flame_severity: FlameLengthInterval;
}

/**
 * Response of the public shared-report endpoint
 * (`v2/funding_report/{uuid}/`): a trimmed, unauthenticated view of a report,
 * with `results` already recalculated for the shared configuration.
 */
export interface FundingReportPublic {
  status: FundingReport['status'];
  results: FundingReportResults | null;
  treatment_datalayer: number | null;
  shared_configuration: FundingReportSharedConfiguration;
}

/**
 * Response of the `funding-report-public-url` endpoint: the public link for the
 * current report configuration (water % + flame interval).
 */
export interface FundingReportPublicUrl {
  public_url: string;
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

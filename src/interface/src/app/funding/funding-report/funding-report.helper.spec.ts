import { FundingReportProjectDataPoint, FundingReportResults } from '@types';
import { aggregateMetricSummary, percentDelta } from './funding-report.helper';

const METRIC = 'POTENTIAL_SMOKE';

function project(
  project_id: number,
  year: number,
  value: number,
  baseline: number
): FundingReportProjectDataPoint {
  return {
    project_id,
    year,
    value,
    baseline,
    delta: percentDelta(value, baseline),
  };
}

/** Results carrying per-project points for METRIC and a sentinel summary. */
function makeResults(
  projects: FundingReportProjectDataPoint[]
): FundingReportResults {
  const empty = {
    POTENTIAL_SMOKE: [],
    ABOVEGROUND_TOTAL: [],
    TOTAL_FLAME_SEVERITY: [],
  };
  return {
    summary: {
      ...empty,
      POTENTIAL_SMOKE: [{ year: 0, value: 999, baseline: 999, delta: 42 }],
    },
    projects: { ...empty, POTENTIAL_SMOKE: projects },
  };
}

describe('funding-report helper', () => {
  describe('percentDelta', () => {
    it('computes percentage change after treatment', () => {
      expect(percentDelta(120, 100)).toBe(20);
      expect(percentDelta(80, 100)).toBe(-20);
    });

    it('returns 0 when there is no baseline', () => {
      expect(percentDelta(50, 0)).toBe(0);
    });
  });

  describe('aggregateMetricSummary', () => {
    const results = makeResults([
      // years intentionally out of order to exercise sorting
      project(1, 5, 90, 100),
      project(1, 0, 120, 100),
      project(2, 5, 150, 100),
      project(2, 0, 80, 100),
    ]);

    it('returns the whole-scenario summary when no areas are selected', () => {
      // passthrough — same reference, not a recompute
      expect(aggregateMetricSummary(results, METRIC, [])).toBe(
        results.summary[METRIC]
      );
    });

    it('aggregates a single selected project, year-sorted', () => {
      expect(aggregateMetricSummary(results, METRIC, [1])).toEqual([
        { year: 0, value: 120, baseline: 100, delta: 20 },
        { year: 5, value: 90, baseline: 100, delta: -10 },
      ]);
    });

    it('sums value and baseline across selected projects, recomputing delta', () => {
      expect(aggregateMetricSummary(results, METRIC, [1, 2])).toEqual([
        { year: 0, value: 200, baseline: 200, delta: 0 },
        { year: 5, value: 240, baseline: 200, delta: 20 },
      ]);
    });

    it('excludes projects that are not selected', () => {
      const onlyProjectTwo = aggregateMetricSummary(results, METRIC, [2]);
      expect(onlyProjectTwo).toEqual([
        { year: 0, value: 80, baseline: 100, delta: -20 },
        { year: 5, value: 150, baseline: 100, delta: 50 },
      ]);
    });

    it('returns an empty list when no selected ids match the report', () => {
      expect(aggregateMetricSummary(results, METRIC, [99])).toEqual([]);
    });

    it('yields a 0 delta when the aggregated baseline is 0', () => {
      const zeroBaseline = makeResults([project(1, 0, 50, 0)]);
      expect(aggregateMetricSummary(zeroBaseline, METRIC, [1])).toEqual([
        { year: 0, value: 50, baseline: 0, delta: 0 },
      ]);
    });
  });
});

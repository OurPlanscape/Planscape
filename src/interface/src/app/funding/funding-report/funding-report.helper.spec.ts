import {
  FundingReportBiomassVolumes,
  FundingReportBiomassVolumesProject,
  FundingReportProjectDataPoint,
  FundingReportResults,
} from '@types';
import {
  aggregateBiomassVolumes,
  aggregateMetricSummary,
  percentDelta,
} from './funding-report.helper';

const METRIC = 'POTENTIAL_SMOKE';

/** A biomass-volumes block with every field set to `fill`. */
function biomass(fill: number): FundingReportBiomassVolumes {
  return {
    merchantable_softwood_bf: fill,
    merchantable_hardwood_bf: fill,
    merchantable_mixed_bf: fill,
    non_merchantable_softwood_cuft: fill,
    non_merchantable_hardwood_cuft: fill,
    non_merchantable_mixed_cuft: fill,
  };
}

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
      expect(aggregateMetricSummary(results, METRIC, [], 'USER')).toBe(
        results.summary[METRIC]
      );
    });

    it('aggregates a single selected project, year-sorted', () => {
      expect(aggregateMetricSummary(results, METRIC, [1], 'USER')).toEqual([
        { year: 0, value: 120, baseline: 100, delta: 20 },
        { year: 5, value: 90, baseline: 100, delta: -10 },
      ]);
    });

    it('sums value and baseline across selected projects, recomputing delta', () => {
      expect(aggregateMetricSummary(results, METRIC, [1, 2], 'USER')).toEqual([
        { year: 0, value: 200, baseline: 200, delta: 0 },
        { year: 5, value: 240, baseline: 200, delta: 20 },
      ]);
    });

    it('excludes projects that are not selected', () => {
      const onlyProjectTwo = aggregateMetricSummary(
        results,
        METRIC,
        [2],
        'USER'
      );
      expect(onlyProjectTwo).toEqual([
        { year: 0, value: 80, baseline: 100, delta: -20 },
        { year: 5, value: 150, baseline: 100, delta: 50 },
      ]);
    });

    it('returns an empty list when no selected ids match the report', () => {
      expect(aggregateMetricSummary(results, METRIC, [99], 'USER')).toEqual([]);
    });

    it('yields a 0 delta when the aggregated baseline is 0', () => {
      const zeroBaseline = makeResults([project(1, 0, 50, 0)]);
      expect(aggregateMetricSummary(zeroBaseline, METRIC, [1], 'USER')).toEqual(
        [{ year: 0, value: 50, baseline: 0, delta: 0 }]
      );
    });

    it('matches SYSTEM-origin selections against proj_id, not project_id', () => {
      // project_id and proj_id diverge: selecting by proj_id picks a different
      // point than the same id would under USER origin.
      const systemResults = makeResults([
        {
          project_id: 10,
          proj_id: 1,
          year: 0,
          value: 120,
          baseline: 100,
          delta: 20,
        },
        {
          project_id: 20,
          proj_id: 2,
          year: 0,
          value: 80,
          baseline: 100,
          delta: -20,
        },
      ]);
      expect(
        aggregateMetricSummary(systemResults, METRIC, [1], 'SYSTEM')
      ).toEqual([{ year: 0, value: 120, baseline: 100, delta: 20 }]);
      // The same id under USER origin matches nothing (no project_id === 1).
      expect(
        aggregateMetricSummary(systemResults, METRIC, [1], 'USER')
      ).toEqual([]);
    });
  });

  describe('aggregateBiomassVolumes', () => {
    const summary = biomass(7);
    const projects: FundingReportBiomassVolumesProject[] = [
      { project_id: 1, proj_id: null, ...biomass(10) },
      { project_id: 2, proj_id: null, ...biomass(3) },
    ];

    const empty = {
      POTENTIAL_SMOKE: [],
      ABOVEGROUND_TOTAL: [],
      TOTAL_FLAME_SEVERITY: [],
    };
    const results: FundingReportResults = {
      summary: { ...empty, BIOMASS_VOLUMES: summary },
      projects: { ...empty, BIOMASS_VOLUMES: projects },
    };

    it('returns the whole-scenario summary when no areas are selected', () => {
      // passthrough — same reference, not a recompute
      expect(aggregateBiomassVolumes(results, [], 'USER')).toBe(summary);
    });

    it('sums each volume field across the selected project areas', () => {
      expect(aggregateBiomassVolumes(results, [1, 2], 'USER')).toEqual(
        biomass(13)
      );
    });

    it('sums only the selected project areas', () => {
      expect(aggregateBiomassVolumes(results, [2], 'USER')).toEqual(biomass(3));
    });

    it('returns undefined when no selected ids match', () => {
      expect(aggregateBiomassVolumes(results, [99], 'USER')).toBeUndefined();
    });

    it('returns undefined when the report carries no biomass data', () => {
      const noBiomass: FundingReportResults = {
        summary: { ...empty },
        projects: { ...empty },
      };
      expect(aggregateBiomassVolumes(noBiomass, [], 'USER')).toBeUndefined();
      expect(aggregateBiomassVolumes(noBiomass, [1], 'USER')).toBeUndefined();
    });

    it('matches SYSTEM-origin selections against proj_id, not project_id', () => {
      const systemResults: FundingReportResults = {
        summary: { ...empty, BIOMASS_VOLUMES: summary },
        projects: {
          ...empty,
          BIOMASS_VOLUMES: [
            { project_id: 10, proj_id: 1, ...biomass(10) },
            { project_id: 20, proj_id: 2, ...biomass(3) },
          ],
        },
      };
      expect(aggregateBiomassVolumes(systemResults, [1], 'SYSTEM')).toEqual(
        biomass(10)
      );
      // The same id under USER origin matches nothing (no project_id === 1).
      expect(
        aggregateBiomassVolumes(systemResults, [1], 'USER')
      ).toBeUndefined();
    });
  });
});

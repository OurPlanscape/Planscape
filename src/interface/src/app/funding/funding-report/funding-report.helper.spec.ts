import {
  FundingReportProjectDataPoint,
  FundingReportResults,
  ProjectArea,
} from '@types';
import { FundingReportAETSummary } from '@types';
import {
  aggregateAetSummary,
  aggregateFlameLengthSummary,
  aggregateMetricSummary,
  hasFlameLengthData,
  percentDelta,
  generateLegendFromReport,
  calculateTreatmentAcreSums,
} from './funding-report.helper';
import { MOCK_GEOMETRY } from '@app/services/mocks';

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
    TOTAL_FLAME_SEVERITY: {},
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

  describe('aggregateAetSummary', () => {
    const summary: FundingReportAETSummary = {
      percentage: 15,
      improved_acres: 30,
      total_project_area_acres: 300,
      planning_area_acres: 1000,
      improved_area_percent: 3,
    };
    const projects = [
      {
        project_id: 1,
        improved_acres: 10,
        total_acres: 100,
        improved_area_percent: 10,
      },
      {
        project_id: 2,
        improved_acres: 20,
        total_acres: 200,
        improved_area_percent: 10,
      },
    ];

    it('returns the whole-scenario summary as-is when no areas are selected', () => {
      expect(aggregateAetSummary(summary, projects, [])).toEqual({
        improved_acres: 30,
        improved_area_percent: 3,
      });
    });

    it('sums the improved acres of the selected project only, over the planning area', () => {
      // 10 improved acres / 1000 planning-area acres * 100 = 1%
      expect(aggregateAetSummary(summary, projects, [1])).toEqual({
        improved_acres: 10,
        improved_area_percent: 1,
      });
    });

    it('sums improved acres across several selected projects', () => {
      // (10 + 20) / 1000 * 100 = 3%
      expect(aggregateAetSummary(summary, projects, [1, 2])).toEqual({
        improved_acres: 30,
        improved_area_percent: 3,
      });
    });

    it('yields zero when no selected ids match the report', () => {
      expect(aggregateAetSummary(summary, projects, [99])).toEqual({
        improved_acres: 0,
        improved_area_percent: 0,
      });
    });

    it('yields a 0 percent when the planning area acreage is missing', () => {
      const noPlanningArea = { ...summary, planning_area_acres: 0 };
      expect(aggregateAetSummary(noPlanningArea, projects, [1])).toEqual({
        improved_acres: 10,
        improved_area_percent: 0,
      });
    });
  });

  describe('flame length intervals', () => {
    // Flame length is pre-calculated per interval, so it's keyed by interval
    // rather than being a flat array like the other metrics.
    const empty = {
      POTENTIAL_SMOKE: [],
      ABOVEGROUND_TOTAL: [],
    };
    const results: FundingReportResults = {
      summary: {
        ...empty,
        TOTAL_FLAME_SEVERITY: {
          '7_4': [{ year: 0, value: 70, baseline: 100, delta: 70 }],
          '4_2': [{ year: 0, value: 40, baseline: 100, delta: 40 }],
        },
      },
      projects: {
        ...empty,
        TOTAL_FLAME_SEVERITY: {
          '7_4': [
            {
              project_id: 1,
              proj_id: 1,
              year: 0,
              value: 70,
              baseline: 100,
              delta: 70,
            },
            {
              project_id: 2,
              proj_id: 2,
              year: 0,
              value: 30,
              baseline: 200,
              delta: 15,
            },
          ],
          '4_2': [
            {
              project_id: 1,
              proj_id: 1,
              year: 0,
              value: 40,
              baseline: 100,
              delta: 40,
            },
          ],
        },
      },
    };

    it('returns the selected interval summary when no areas are selected', () => {
      expect(aggregateFlameLengthSummary(results, '7_4', [])).toEqual([
        { year: 0, value: 70, baseline: 100, delta: 70 },
      ]);
      expect(aggregateFlameLengthSummary(results, '4_2', [])).toEqual([
        { year: 0, value: 40, baseline: 100, delta: 40 },
      ]);
    });

    it('aggregates the selected interval over the chosen project areas, as share of area reduced', () => {
      // Filtering by project area sums value/baseline and recomputes the delta
      // as the share of total area reduced: 70 / 100 * 100 = 70 (not the
      // time-series percent-change formula).
      expect(aggregateFlameLengthSummary(results, '7_4', [1])).toEqual([
        { year: 0, value: 70, baseline: 100, delta: 70 },
      ]);
    });

    it('sums value and baseline across selected project areas before the delta', () => {
      // value = 70 + 30 = 100, baseline = 100 + 200 = 300, delta = 100/300*100.
      expect(aggregateFlameLengthSummary(results, '7_4', [1, 2])).toEqual([
        { year: 0, value: 100, baseline: 300, delta: (100 / 300) * 100 },
      ]);
    });

    it('returns an empty list for an interval the report has no data for', () => {
      expect(aggregateFlameLengthSummary(results, '6_4', [])).toEqual([]);
    });

    it('reports whether the selected interval has data', () => {
      expect(hasFlameLengthData(results, '7_4', [])).toBeTrue();
      expect(hasFlameLengthData(results, '6_4', [])).toBeFalse();
    });
  });
});

describe('calculateTreatmentAcreSums', () => {
  it('should return empty array for empty input', () => {
    const result = calculateTreatmentAcreSums([]);
    expect(result).toEqual({ noTreatmentSum: 0, treatmentSums: [] });
  });

  it('should aggregate treatment acres from realistic input', () => {
    const input = [
      { 'No Treatment': 101, 'Thin and Rx Burn': 654 },
      { 'Rx Burn': 444, 'No Treatment': 105, 'Thin and Rx Burn': 101 },
      { 'Rx Burn': 555, 'No Treatment': 200, 'Thin and Rx Burn': 333 },
    ] as Record<string, number>[];
    const result = calculateTreatmentAcreSums(input);
    expect(result).toEqual({
      treatmentSums: [
        { treatment: 'Rx Burn', acres: 999 },
        { treatment: 'Thin and Rx Burn', acres: 1088 },
      ],
      noTreatmentSum: 406,
    });
  });
});

describe('generateLegendFromReport', () => {
  const mockProjectAreas: ProjectArea[] = [
    {
      id: 1,
      scenario: 666666,
      name: 'Proj Area 1',
      data: {
        YR: 2026,
        proj_id: 20001,
        pct_area: 10,
        area_acres: 500,
        total_cost: 27000,
        stand_count: 15,
        pct_excluded: 1,
        cost_per_acre: 2700,
        treatment_rank: 1,
        weightedPriority: 1,
      },
      geometry: MOCK_GEOMETRY,
    },
    {
      id: 2,
      scenario: 666666,
      name: 'Proj Area 2',
      data: {
        YR: 2026,
        proj_id: 20002,
        pct_area: 20,
        area_acres: 1000,
        total_cost: 54000,
        stand_count: 30,
        pct_excluded: 2,
        cost_per_acre: 2700,
        treatment_rank: 2,
        weightedPriority: 2,
      },
      geometry: MOCK_GEOMETRY,
    },
    {
      id: 3,
      scenario: 666666,
      name: 'Proj Area 3',
      data: {
        YR: 2026,
        proj_id: 20003,
        pct_area: 15,
        area_acres: 750,
        total_cost: 40500,
        stand_count: 22,
        pct_excluded: 1.5,
        cost_per_acre: 2700,
        treatment_rank: 3,
        weightedPriority: 1.5,
      },
      geometry: MOCK_GEOMETRY,
    },
    {
      id: 4,
      scenario: 777777,
      name: 'Proj Area 4',
      data: {
        YR: 2027,
        proj_id: 30001,
        pct_area: 25,
        area_acres: 1250,
        total_cost: 67500,
        stand_count: 35,
        pct_excluded: 3,
        cost_per_acre: 2700,
        treatment_rank: 1,
        weightedPriority: 3,
      },
      geometry: MOCK_GEOMETRY,
    },
  ];

  // Mock treatment areas matching the project area IDs
  const mockTreatmentAreas = {
    total: {},
    projects: {
      '1': {
        'Rx Burn': 157,
        'No Treatment': 250,
        'Thin and Rx Burn': 250,
      },
      '2': {
        'No Treatment': 400,
        'Rx Burn': 600,
        'Thin and Rx Burn': 0,
      },
      '3': {
        'No Treatment': 300,
        'Rx Burn': 300,
        'Thin and Rx Burn': 150,
      },
      '4': {
        'Rx Burn': 21,
        'No Treatment': 450,
        'Thin and Rx Burn': 800,
      },
    },
  };

  const empty = {
    POTENTIAL_SMOKE: [],
    ABOVEGROUND_TOTAL: [],
  };
  const mockResults: FundingReportResults = {
    summary: {
      ...empty,
      POTENTIAL_SMOKE: [{ year: 0, value: 999, baseline: 999, delta: 42 }],
    },
    projects: {
      ...empty,
      TOTAL_FLAME_SEVERITY: {
        '7_4': [
          {
            project_id: 1,
            proj_id: 1,
            year: 0,
            value: 70,
            baseline: 100,
            delta: 70,
          },
          {
            project_id: 2,
            proj_id: 2,
            year: 0,
            value: 30,
            baseline: 200,
            delta: 15,
          },
        ],
        '4_2': [
          {
            project_id: 1,
            proj_id: 1,
            year: 0,
            value: 40,
            baseline: 100,
            delta: 40,
          },
        ],
      },
    },
    treatment_areas: mockTreatmentAreas,
  };

  it('should return zeros when results is null', () => {
    const result = generateLegendFromReport(null, [1, 2], mockProjectAreas);
    expect(result).toEqual({ selectedAcres: 0, noTreatmentAcres: 0 });
  });

  it('should calculate selectedAcres from selected areas (ids 1 and 3: 500 + 750 = 1250)', () => {
    const result = generateLegendFromReport(
      mockResults,
      [1, 3],
      mockProjectAreas
    );
    expect(result.selectedAcres).toBe(1250);
  });

  it('should calculate treatment totals using mock treatment areas', () => {
    const result = generateLegendFromReport(
      mockResults,
      [1, 2, 3, 4],
      mockProjectAreas
    );
    expect(result).toEqual({
      selectedAcres: 3500,
      treatmentAcresTotals: [
        { treatment: 'Rx Burn', acres: 1078 },
        { treatment: 'Thin and Rx Burn', acres: 1200 },
      ],
      noTreatmentAcres: 1400,
    });
  });

  it('should filter treatment results by selectedAreas (only ids 1 and 3)', () => {
    const result = generateLegendFromReport(
      mockResults,
      [1, 3],
      mockProjectAreas
    );
    expect(result.selectedAcres).toBe(1250);
    expect(result.treatmentAcresTotals).toEqual([
      { treatment: 'Rx Burn', acres: 457 },
      { treatment: 'Thin and Rx Burn', acres: 400 },
    ]);
    expect(result.noTreatmentAcres).toBe(550);
  });

  it('should select all areas when selectedAreas is empty', () => {
    const result = generateLegendFromReport(mockResults, [], mockProjectAreas);
    expect(result.selectedAcres).toBe(3500);
  });
});

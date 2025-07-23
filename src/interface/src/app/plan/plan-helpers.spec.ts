import { TestBed } from '@angular/core/testing';
import {
  getColorForProjectPosition,
  isValidTotalArea,
  processCumulativeAttainment,
} from './plan-helpers';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';

interface Feature {
  properties: {
    area_acres: number;
    attainment: Record<string, number>;
  };
}

describe('Plan Helpers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('getColorForProjectPosition', () => {
    it('should return a color based on the rank position', () => {
      expect(getColorForProjectPosition(1)).toBe(PROJECT_AREA_COLORS[0]);
    });

    it('should cycle thru the colors if more than defined', () => {
      expect(getColorForProjectPosition(52)).toBe(PROJECT_AREA_COLORS[1]);
    });

    it('should return default color if position is invalid', () => {
      expect(getColorForProjectPosition(0)).toBe(DEFAULT_AREA_COLOR);

      expect(getColorForProjectPosition(-32)).toBe(DEFAULT_AREA_COLOR);
    });
  });

  describe('isValidTotalArea', () => {
    it('should validate that area is more than 100 acres', () => {
      expect(isValidTotalArea(99)).toBe(false);
      expect(isValidTotalArea(100)).toBe(true);
      expect(isValidTotalArea(1000)).toBe(true);
    });
  });

  describe('processCumulativeAttainment', () => {
    it('should return empty arrays when features is empty', () => {
      const result = processCumulativeAttainment([]);
      expect(result.area).toEqual([]);
      expect(result.datasets).toEqual([]);
    });

    it('should handle a single feature by returning its area and raw attainment as the running sum', () => {
      const features: Feature[] = [
        {
          properties: {
            area_acres: 50,
            attainment: { A: 5, B: 15 },
          },
        },
      ];

      const { area, datasets } = processCumulativeAttainment(features);

      expect(area).toEqual([50]);

      const byLabel = datasets.reduce(
        (acc, ds) => {
          acc[ds.label] = ds.data;
          return acc;
        },
        {} as Record<string, number[]>
      );

      expect(Object.keys(byLabel).sort()).toEqual(['A', 'B']);
      expect(byLabel['A']).toEqual([5]);
      expect(byLabel['B']).toEqual([15]);
    });

    it('should compute the running sum of attainment values over multiple features with exact decimals', () => {
      const features: Feature[] = [
        { properties: { area_acres: 10, attainment: { FLDH: 0.5 } } },
        { properties: { area_acres: 15, attainment: { FLDH: 0.25 } } },
        { properties: { area_acres: 20, attainment: { FLDH: 0.125 } } },
        { properties: { area_acres: 5, attainment: { FLDH: 0.125 } } },
      ];

      const { area, datasets } = processCumulativeAttainment(features);

      // cumulative area should be correct
      expect(area).toEqual([10, 25, 45, 50]);

      // only one metric present
      expect(datasets.length).toBe(1);
      const ds = datasets[0];
      expect(ds.label).toBe('FLDH');

      expect(ds.data).toEqual([0.5, 0.75, 0.875, 1]);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { getColorForProjectPosition, isValidTotalArea } from './plan-helpers';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';

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
});

import { TestBed } from '@angular/core/testing';
import { getColorForProjectPosition } from './plan-helpers';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '../shared/constants';

describe('Plan Helpers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('getColorForProjectPosition', () => {
    it('should return a color based on the rank position', () => {
      expect(getColorForProjectPosition(1)).toBe(PROJECT_AREA_COLORS[0]);
    });

    it('should cycle thru the colors if more than defined', () => {
      expect(getColorForProjectPosition(12)).toBe(PROJECT_AREA_COLORS[1]);
    });

    it('should return default color if position is invalid', () => {
      expect(getColorForProjectPosition(0)).toBe(DEFAULT_AREA_COLOR);

      expect(getColorForProjectPosition(-32)).toBe(DEFAULT_AREA_COLOR);
    });
  });

  describe('findQuestionOnTreatmentGoalsConfig', () => {
    it('should return the question **from** treatmentQuestion', () => {});
  });
});

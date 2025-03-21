import { TestBed } from '@angular/core/testing';
import {
  findQuestionOnTreatmentGoalsConfig,
  getColorForProjectPosition,
  isValidTotalArea,
} from './plan-helpers';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';
import { TreatmentGoalConfig, TreatmentQuestionConfig } from '@types';

const questions = [
  {
    id: 1,
    short_question_text: 'test_question',
    scenario_output_fields_paths: {},
    scenario_priorities: [''],
    stand_thresholds: [''],
    global_thresholds: [''],
    weights: [1],
  },
];

const defaultQuestion: TreatmentQuestionConfig = {
  id: 2,
  short_question_text: 'this is the question',
  scenario_output_fields_paths: {},
  scenario_priorities: [''],
  stand_thresholds: [''],
  global_thresholds: [''],
  weights: [0],
};

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

  describe('findQuestionOnTreatmentGoalsConfig', () => {
    it('should find the treatmentQuestion on treatmentGoalConfigs', () => {
      const tr: TreatmentGoalConfig[] = [
        {
          category_name: 'test_category',
          questions: [...questions, defaultQuestion],
        },
      ];
      expect(findQuestionOnTreatmentGoalsConfig(tr, defaultQuestion)).toBe(
        defaultQuestion
      );
    });

    it('should return the question **from** treatmentQuestion', () => {
      const tr: TreatmentGoalConfig[] = [
        {
          category_name: 'test_category',
          questions: [...questions, defaultQuestion],
        },
      ];
      const almostDefaultQuestion = { ...defaultQuestion };
      expect(
        findQuestionOnTreatmentGoalsConfig(tr, almostDefaultQuestion)
      ).toBe(defaultQuestion);

      expect(
        findQuestionOnTreatmentGoalsConfig(tr, almostDefaultQuestion)
      ).not.toBe(almostDefaultQuestion);
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

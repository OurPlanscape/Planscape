import { TreatmentSummary } from '@types';
import { getTreatmentTypeOptions } from './prescriptions';
import { MOCK_SUMMARY } from './mocks';

describe('getTreatmentTypeOptions', () => {
  it('should return initial value when summary has no project areas', () => {
    const mock: TreatmentSummary = Object.assign({}, MOCK_SUMMARY);
    mock.project_areas = [];
    const result = getTreatmentTypeOptions(mock);
    expect(result).toEqual([]);
  });

  it('should return just single options and no repeated', () => {
    const mock = Object.assign({}, MOCK_SUMMARY);
    mock.project_areas[0].prescriptions = [
      {
        action: 'MODERATE_THINNING_BIOMASS',
        area_acres: 12,
        treated_stand_count: 12,
        type: 'SINGLE',
        stand_ids: [0, 1, 2, 3],
      },
      {
        action: 'MODERATE_THINNING_BIOMASS',
        area_acres: 11,
        treated_stand_count: 11,
        type: 'SINGLE',
        stand_ids: [93, 12, 24, 35],
      },
    ];
    const result = getTreatmentTypeOptions(mock);
    expect(result).toEqual(['MODERATE_THINNING_BIOMASS']);
  });

  it('should return just sequence options and no repeated', () => {
    const mock = Object.assign({}, MOCK_SUMMARY);
    mock.project_areas[0].prescriptions = [
      {
        action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
        area_acres: 12,
        treated_stand_count: 12,
        type: 'SEQUENCE',
        stand_ids: [33, 34, 35, 36],
      },
      {
        action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
        area_acres: 555,
        treated_stand_count: 666,
        type: 'SEQUENCE',
        stand_ids: [99, 77, 66, 55],
      },
    ];
    const result = getTreatmentTypeOptions(mock);
    expect(result).toEqual(['MODERATE_THINNING_BURN_PLUS_RX_FIRE']);
  });

  it('should return no repeated options  ', () => {
    const mock = Object.assign({}, MOCK_SUMMARY);
    mock.project_areas[0].prescriptions = [
      {
        action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
        area_acres: 12,
        treated_stand_count: 12,
        type: 'SEQUENCE',
        stand_ids: [33, 34, 35, 36],
      },
      {
        action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
        area_acres: 555,
        treated_stand_count: 666,
        type: 'SEQUENCE',
        stand_ids: [99, 77, 66, 55],
      },
      {
        action: 'MODERATE_THINNING_BIOMASS',
        area_acres: 12,
        treated_stand_count: 12,
        type: 'SINGLE',
        stand_ids: [0, 1, 2, 3],
      },
      {
        action: 'MODERATE_THINNING_BIOMASS',
        area_acres: 11,
        treated_stand_count: 11,
        type: 'SINGLE',
        stand_ids: [93, 12, 24, 35],
      },
    ];
    const result = getTreatmentTypeOptions(mock);
    expect(result).toEqual([
      'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
      'MODERATE_THINNING_BIOMASS',
    ]);
  });
});

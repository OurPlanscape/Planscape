import { TreatmentSummary } from '@types';
import { getPrescriptionsFromSummary } from './prescriptions';

describe('getPrescriptionsFromSummary', () => {
  it('should return an empty array if summary is null', () => {
    expect(getPrescriptionsFromSummary(null)).toEqual([]);
  });

  it('should return an empty array if summary.project_areas is undefined', () => {
    expect(getPrescriptionsFromSummary({} as TreatmentSummary)).toEqual([]);
  });

  it('should return an empty array if there are no prescriptions', () => {
    const summary = {
      project_areas: [{ prescriptions: [] }],
    };
    expect(getPrescriptionsFromSummary(summary as any)).toEqual([]);
  });

  it('should return unique prescriptions based on action', () => {
    const summary = {
      project_areas: [
        { prescriptions: [{ action: 'A' }, { action: 'B' }] },
        { prescriptions: [{ action: 'B' }, { action: 'C' }] },
      ],
    };
    expect(getPrescriptionsFromSummary(summary as any)).toEqual([
      { action: 'A' },
      { action: 'B' },
      { action: 'C' },
    ] as any);
  });

  it('should not include duplicate prescriptions', () => {
    const summary = {
      project_areas: [
        { prescriptions: [{ action: 'A' }, { action: 'A' }] },
        { prescriptions: [{ action: 'A' }, { action: 'A' }] },
      ] as any,
    };
    expect(getPrescriptionsFromSummary(summary as any)).toEqual([
      { action: 'A' },
    ] as any);
  });
});

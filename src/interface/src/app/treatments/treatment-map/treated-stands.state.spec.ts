import { TestBed } from '@angular/core/testing';

import { TreatedStandsState } from './treated-stands.state';
import { TreatedStand } from '@types';

describe('TreatedStandsState', () => {
  let service: TreatedStandsState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new TreatedStandsState();
  });

  it('should initialize with an empty list of treated stands', () => {
    expect(service.getTreatedStands()).toEqual([]);
  });

  it('should set treated stands', () => {
    const stands: TreatedStand[] = [
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment B' },
    ];
    service.setTreatedStands(stands);

    expect(service.getTreatedStands()).toEqual(stands);
  });

  it('should update treated stands and replace existing ones with the same ID', () => {
    const initialStands: TreatedStand[] = [
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment B' },
    ];
    service.setTreatedStands(initialStands);

    const newStands: TreatedStand[] = [
      { id: 2, action: 'Updated Treatment' },
      { id: 3, action: 'Treatment C' },
    ];
    service.updateTreatedStands(newStands);

    expect(service.getTreatedStands()).toEqual([
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Updated Treatment' },
      { id: 3, action: 'Treatment C' },
    ]);
  });

  it('should update treated stands and add new ones without affecting others', () => {
    const initialStands: TreatedStand[] = [{ id: 1, action: 'Treatment A' }];
    service.setTreatedStands(initialStands);

    const newStands: TreatedStand[] = [
      { id: 2, action: 'Treatment B' },
      { id: 3, action: 'Treatment C' },
    ];
    service.updateTreatedStands(newStands);

    expect(service.getTreatedStands()).toEqual([
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment B' },
      { id: 3, action: 'Treatment C' },
    ]);
  });

  it('should update treated stands if the same ID is provided', () => {
    const initialStands: TreatedStand[] = [
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment B' },
    ];
    service.setTreatedStands(initialStands);

    const newStands: TreatedStand[] = [
      { id: 2, action: 'Treatment C' },
      { id: 3, action: 'Treatment D' },
    ];
    service.updateTreatedStands(newStands);

    expect(service.getTreatedStands()).toEqual([
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment C' },
      { id: 3, action: 'Treatment D' },
    ]);
  });

  it('should remove treated stands', () => {
    const initialStands: TreatedStand[] = [
      { id: 1, action: 'Treatment A' },
      { id: 2, action: 'Treatment B' },
      { id: 3, action: 'Treatment C' },
      { id: 4, action: 'Treatment D' },
    ];
    service.setTreatedStands(initialStands);

    const stands = [2, 4];
    service.removeTreatments(stands);

    expect(service.getTreatedStands()).toEqual([
      { id: 1, action: 'Treatment A' },
      { id: 3, action: 'Treatment C' },
    ]);
  });
});

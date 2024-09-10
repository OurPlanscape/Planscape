import { TestBed } from '@angular/core/testing';
import { SelectedStandsState } from './selected-stands.state';

describe('SelectedStandsState', () => {
  let service: SelectedStandsState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new SelectedStandsState();
  });

  it('should initialize with an empty list of selected stands', () => {
    expect(service.getSelectedStands()).toEqual([]);
  });

  it('should update selected stands', () => {
    const stands = [1, 2, 3];
    service.updateSelectedStands(stands);

    expect(service.getSelectedStands()).toEqual(stands);
  });

  it('should clear selected stands', () => {
    service.updateSelectedStands([1, 2, 3]);
    service.clearStands();

    expect(service.getSelectedStands()).toEqual([]);
  });

  it('should get the current selected stands', () => {
    const stands = [1, 2, 3];
    service.updateSelectedStands(stands);

    expect(service.getSelectedStands()).toEqual(stands);
  });

  it('should toggle a stand on if not already selected', () => {
    const standId = 1;
    service.toggleStand(standId);

    expect(service.getSelectedStands()).toContain(standId);
  });

  it('should toggle a stand off if already selected', () => {
    const standId = 1;
    service.updateSelectedStands([standId]);
    service.toggleStand(standId);

    expect(service.getSelectedStands()).not.toContain(standId);
  });

  it('should toggle multiple stands correctly', () => {
    const standId1 = 1;
    const standId2 = 2;

    // Add standId1
    service.toggleStand(standId1);
    expect(service.getSelectedStands()).toEqual([standId1]);

    // Add standId2
    service.toggleStand(standId2);
    expect(service.getSelectedStands()).toEqual([standId1, standId2]);

    // Remove standId1
    service.toggleStand(standId1);
    expect(service.getSelectedStands()).toEqual([standId2]);

    // Remove standId2
    service.toggleStand(standId2);
    expect(service.getSelectedStands()).toEqual([]);
  });
});

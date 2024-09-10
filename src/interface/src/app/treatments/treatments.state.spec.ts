import { TestBed } from '@angular/core/testing';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { of, throwError } from 'rxjs';
import { TreatedStand, TreatmentPlan, TreatmentSummary } from '@types';
import { TreatmentsState } from './treatments.state';
import { MockProvider } from 'ng-mocks';

describe('TreatmentsState', () => {
  let service: TreatmentsState;
  let treatmentsService: TreatmentsService;
  let treatedStandsState: TreatedStandsState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TreatmentsState,
        MockProvider(TreatmentsService),
        MockProvider(TreatedStandsState),
      ],
    });

    service = TestBed.inject(TreatmentsState);
    treatmentsService = TestBed.inject(TreatmentsService);
    treatedStandsState = TestBed.inject(TreatedStandsState);

    spyOn(treatedStandsState, 'setTreatedStands').and.callThrough();
    spyOn(treatedStandsState, 'updateTreatedStands').and.callThrough();
    spyOn(treatedStandsState, 'removeTreatments').and.callThrough();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw an error if treatment plan ID is not set', () => {
    expect(() => service.getTreatmentPlanId()).toThrowError(
      'no treatment plan id!'
    );
  });

  it('should return the treatment plan ID if it is set', () => {
    service.setTreatmentPlanId(123);
    expect(service.getTreatmentPlanId()).toBe(123);
  });

  it('should set and get the project area ID', () => {
    service.setProjectAreaId(456);
    expect(service.getProjectAreaId()).toBe(456);

    service.setProjectAreaId(undefined);
    expect(service.getProjectAreaId()).toBeUndefined();
  });

  it('should load summary and set treated stands', () => {
    const mockSummary: TreatmentSummary = {
      project_areas: [
        {
          project_area_id: 1,
          project_area_name: 'Area 1',
          total_stand_count: 10,
          prescriptions: [
            {
              action: 'cut',
              area_acres: 100,
              treated_stand_count: 3,
              type: 'type1',
              stand_ids: [1, 2, 3],
            },
            {
              action: 'burn',
              area_acres: 50,
              treated_stand_count: 2,
              type: 'type2',
              stand_ids: [4, 5],
            },
          ],
        },
      ],
    };

    spyOn(treatmentsService, 'getTreatmentPlanSummary').and.returnValue(
      of(mockSummary)
    );

    service.setTreatmentPlanId(123);
    service.loadSummary();

    expect(treatedStandsState.setTreatedStands).toHaveBeenCalledWith([]);
    expect(treatedStandsState.setTreatedStands).toHaveBeenCalledWith([
      { id: 1, action: 'cut' },
      { id: 2, action: 'cut' },
      { id: 3, action: 'cut' },
      { id: 4, action: 'burn' },
      { id: 5, action: 'burn' },
    ]);
    service.summary$.subscribe((summary) => {
      expect(summary).toEqual(mockSummary);
    });
  });

  it('should load treatment plan and update the observable', () => {
    const mockTreatmentPlan: TreatmentPlan = {
      id: 123,
      name: 'Plan 1',
      status: 'SUCCESS',
      created_at: '2024-01-01T00:00:00Z',
      creator_name: 'John Doe',
    };

    spyOn(treatmentsService, 'getTreatmentPlan').and.returnValue(
      of(mockTreatmentPlan)
    );

    service.setTreatmentPlanId(123);
    service.loadTreatmentPlan();

    service.treatmentPlan$.subscribe((treatmentPlan) => {
      expect(treatmentPlan).toEqual(mockTreatmentPlan);
    });
  });

  it('should throw an error if project area ID is not set when updating treated stands', () => {
    expect(() => service.updateTreatedStands('cut', [1, 2])).toThrowError(
      'Project area Id is required to update stands'
    );
  });

  it('should update treated stands and call the service', () => {
    service.setTreatmentPlanId(123);
    service.setProjectAreaId(456);

    spyOn(treatmentsService, 'setTreatments').and.returnValue(of({}));

    service.updateTreatedStands('cut', [1, 2]);

    expect(treatedStandsState.updateTreatedStands).toHaveBeenCalledWith([
      { id: 1, action: 'cut' },
      { id: 2, action: 'cut' },
    ]);
    expect(treatmentsService.setTreatments).toHaveBeenCalledWith(
      123,
      456,
      'cut',
      [1, 2]
    );
  });

  it('should revert treated stands on update error', () => {
    service.setTreatmentPlanId(123);
    service.setProjectAreaId(456);

    const originalStands: TreatedStand[] = [{ id: 1, action: 'cut' }];
    spyOn(treatedStandsState, 'getTreatedStands').and.returnValue(
      originalStands
    );
    spyOn(treatmentsService, 'setTreatments').and.returnValue(
      throwError(() => new Error('Update failed'))
    );

    service.updateTreatedStands('cut', [2, 3]).subscribe({
      error: (err) => {
        expect(err.message).toBe('Update failed');
      },
    });

    expect(treatedStandsState.setTreatedStands).toHaveBeenCalledWith(
      originalStands
    );
  });

  it('should remove treated stands and call the service', () => {
    service.setTreatmentPlanId(123);
    service.setProjectAreaId(456);
    const originalStands: TreatedStand[] = [
      { id: 1, action: 'cut' },
      { id: 2, action: 'cut' },
      { id: 3, action: 'burn' },
    ];
    spyOn(treatedStandsState, 'getTreatedStands').and.returnValue(
      originalStands
    );
    spyOn(treatmentsService, 'setTreatments').and.returnValue(of({}));
    spyOn(treatmentsService, 'removeTreatments').and.returnValue(of({}));

    service.removeTreatments([1, 3]);

    expect(treatmentsService.removeTreatments).toHaveBeenCalledWith(
      123,
      [1, 3]
    );
  });

  it('should revert treated stands on remove error', () => {
    service.setTreatmentPlanId(123);
    service.setProjectAreaId(456);

    const originalStands: TreatedStand[] = [{ id: 1, action: 'cut' }];
    spyOn(treatedStandsState, 'getTreatedStands').and.returnValue(
      originalStands
    );
    spyOn(treatmentsService, 'removeTreatments').and.returnValue(
      throwError(() => new Error('Remove failed'))
    );

    service.removeTreatments([2, 3]).subscribe({
      error: (err) => {
        expect(err.message).toBe('Remove failed');
      },
    });

    expect(treatedStandsState.setTreatedStands).toHaveBeenCalledWith(
      originalStands
    );
  });
});

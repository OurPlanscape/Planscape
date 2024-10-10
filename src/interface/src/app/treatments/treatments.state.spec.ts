import { TestBed } from '@angular/core/testing';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { TreatmentsState } from './treatments.state';
import { MockProviders } from 'ng-mocks';
import { MapConfigState } from './treatment-map/map-config.state';
import { TreatedStand, TreatmentPlan, TreatmentSummary } from '@types';
import { firstValueFrom, of, throwError } from 'rxjs';

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
          type: 'SINGLE',
          stand_ids: [1, 2, 3],
        },
        {
          action: 'burn',
          area_acres: 50,
          treated_stand_count: 2,
          type: 'SEQUENCE',
          stand_ids: [4, 5],
        },
      ],
      extent: [1, 2, 3, 4],
      centroid: {
        type: 'Point',
        coordinates: [],
      },
    },
  ],
  extent: [1, 2, 3, 4],
  planning_area_id: 1,
  planning_area_name: 'Test',
  scenario_id: 2,
  scenario_name: 'Test Scenario',
  treatment_plan_id: 3,
  treatment_plan_name: 'Test Treatment Plan',
};

const mockTreatmentPlan: TreatmentPlan = {
  id: 123,
  name: 'Plan 1',
  status: 'SUCCESS',
  created_at: '2024-01-01T00:00:00Z',
  creator_name: 'John Doe',
};

describe('TreatmentsState', () => {
  let service: TreatmentsState;
  let treatmentsService: TreatmentsService;
  let treatedStandsState: TreatedStandsState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TreatmentsState,
        MockProviders(MapConfigState, TreatedStandsState, TreatmentsService),
      ],
    });

    service = TestBed.inject(TreatmentsState);
    treatmentsService = TestBed.inject(TreatmentsService);
    treatedStandsState = TestBed.inject(TreatedStandsState);

    spyOn(treatedStandsState, 'setTreatedStands').and.callThrough();
    spyOn(treatedStandsState, 'updateTreatedStands').and.callThrough();
    spyOn(treatedStandsState, 'removeTreatments').and.callThrough();

    spyOn(treatmentsService, 'getTreatmentPlanSummary').and.returnValue(
      of(mockSummary)
    );
    spyOn(treatmentsService, 'getTreatmentPlan').and.returnValue(
      of(mockTreatmentPlan)
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw an error if treatment plan ID is not set', () => {
    expect(() => service.getTreatmentPlanId()).toThrowError(
      'no treatment plan id!'
    );
  });

  describe('loadTreatmentByRouteData', () => {
    describe('set initial data', () => {
      it('should save data', () => {
        service.loadTreatmentByRouteData({
          scenarioId: 1,
          treatmentId: 123,
          projectAreaId: undefined,
        });
        expect(service.getTreatmentPlanId()).toBe(123);
        expect(service.getScenarioId()).toBe(1);
        expect(service.getProjectAreaId()).toBe(undefined);
      });

      it('should set project area if provided', () => {
        service.loadTreatmentByRouteData({
          scenarioId: 1,
          treatmentId: 123,
          projectAreaId: 456,
        });
        expect(service.getProjectAreaId()).toBe(456);
      });
    });

    it('should load summary', async () => {
      await firstValueFrom(
        service.loadTreatmentByRouteData({
          scenarioId: 1,
          treatmentId: 123,
          projectAreaId: undefined,
        })
      );
      expect(treatmentsService.getTreatmentPlanSummary).toHaveBeenCalled();
      const summary = await firstValueFrom(service.summary$);
      expect(summary).toEqual(mockSummary);
    });

    it('should load treatment plan', async () => {
      await firstValueFrom(
        service.loadTreatmentByRouteData({
          scenarioId: 1,
          treatmentId: 123,
          projectAreaId: undefined,
        })
      );
      expect(treatmentsService.getTreatmentPlan).toHaveBeenCalled();
      const plan = await firstValueFrom(service.treatmentPlan$);
      expect(plan).toEqual(mockTreatmentPlan);
    });
  });

  //
  it('should throw an error if project area ID is not set when updating treated stands', () => {
    expect(() => service.updateTreatedStands('cut', [1, 2])).toThrowError(
      'Project area Id is required to update stands'
    );
  });
  //
  it('should update treated stands and call the service', () => {
    service.loadTreatmentByRouteData({
      scenarioId: 1,
      treatmentId: 123,
      projectAreaId: 456,
    });
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
    service.loadTreatmentByRouteData({
      scenarioId: 1,
      treatmentId: 123,
      projectAreaId: 456,
    });

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
    service.loadTreatmentByRouteData({
      scenarioId: 1,
      treatmentId: 123,
      projectAreaId: 456,
    });
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
    service.loadTreatmentByRouteData({
      scenarioId: 1,
      treatmentId: 123,
      projectAreaId: 456,
    });

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

import { TestBed } from '@angular/core/testing';
import { TreatmentsService } from '@services/treatments.service';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { TreatmentsState } from './treatments.state';
import { MockProviders } from 'ng-mocks';
import { MapConfigState } from './treatment-map/map-config.state';
import { TreatedStand } from '@types';
import { firstValueFrom, of, throwError } from 'rxjs';
import { RemovingStandsError, UpdatingStandsError } from './treatment-errors';
import { MOCK_SUMMARY, MOCK_TREATMENT_PLAN } from './mocks';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TreatmentsState', () => {
  let service: TreatmentsState;
  let treatmentsService: TreatmentsService;
  let treatedStandsState: TreatedStandsState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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
      of(MOCK_SUMMARY)
    );
    spyOn(treatmentsService, 'getTreatmentPlan').and.returnValue(
      of(MOCK_TREATMENT_PLAN)
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
          planId: 1,
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
          planId: 1,
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
          planId: 1,
        })
      );
      expect(treatmentsService.getTreatmentPlanSummary).toHaveBeenCalled();
      const summary = await firstValueFrom(service.summary$);
      expect(summary).toEqual(MOCK_SUMMARY);
    });

    it('should load treatment plan', async () => {
      await firstValueFrom(
        service.loadTreatmentByRouteData({
          scenarioId: 1,
          treatmentId: 123,
          projectAreaId: undefined,
          planId: 1,
        })
      );
      expect(treatmentsService.getTreatmentPlan).toHaveBeenCalled();
      const plan = await firstValueFrom(service.treatmentPlan$);
      expect(plan).toEqual(MOCK_TREATMENT_PLAN);
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
      planId: 1,
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
      planId: 1,
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
        expect(err instanceof UpdatingStandsError).toBe(true);
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
      planId: 1,
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
      planId: 1,
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
        expect(err instanceof RemovingStandsError).toBe(true);
      },
    });

    expect(treatedStandsState.setTreatedStands).toHaveBeenCalledWith(
      originalStands
    );
  });
});

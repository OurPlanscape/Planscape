import { TestBed } from '@angular/core/testing';
import { treatmentStateResolver } from './treatment-state.resolver';
import { TreatmentsState } from './treatments.state';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MapConfigState } from './treatment-map/map-config.state';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

describe('treatmentStateResolver', () => {
  let treatmentsState: TreatmentsState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MockProvider(MapConfigState),
        MockProvider(TreatmentsState, {
          loadSummary: () => of(true),
          loadTreatmentPlan: () => of(true),
          loadSummaryForProjectArea: () => of(true),
        }),
      ],
    });

    treatmentsState = TestBed.inject(TreatmentsState);
    spyOn(treatmentsState, 'setTreatmentPlanId').and.callThrough();
    spyOn(treatmentsState, 'setProjectAreaId').and.callThrough();
    spyOn(treatmentsState, 'loadSummary').and.callThrough();
    spyOn(treatmentsState, 'loadSummaryForProjectArea').and.callThrough();
    spyOn(treatmentsState, 'loadTreatmentPlan').and.callThrough();
  });

  it('should resolve and call TreatmentsState methods correctly', () => {
    const route = {
      paramMap: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          switch (key) {
            case 'treatmentId':
              return '123';
            default:
              return null;
          }
        }),
      },
    } as unknown as ActivatedRouteSnapshot;

    const state = {} as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => {
      const result = treatmentStateResolver(route, state);

      expect(treatmentsState.setTreatmentPlanId).toHaveBeenCalledWith(123);
      expect(treatmentsState.loadSummary).toHaveBeenCalled();
      expect(treatmentsState.loadTreatmentPlan).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  it('should resolve and call TreatmentsState methods correctly', () => {
    const route = {
      paramMap: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          switch (key) {
            case 'treatmentId':
              return '123';
            case 'projectAreaId':
              return '456';
            default:
              return null;
          }
        }),
      },
    } as unknown as ActivatedRouteSnapshot;

    const state = {} as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => {
      const result = treatmentStateResolver(route, state);

      expect(treatmentsState.setTreatmentPlanId).toHaveBeenCalledWith(123);
      expect(treatmentsState.setProjectAreaId).toHaveBeenCalledWith(456);
      expect(treatmentsState.loadSummaryForProjectArea).toHaveBeenCalled();
      expect(treatmentsState.loadTreatmentPlan).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  it('should handle undefined projectAreaId', () => {
    const route = {
      paramMap: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          switch (key) {
            case 'treatmentId':
              return '123';
            case 'projectAreaId':
              return null;
            default:
              return null;
          }
        }),
      },
    } as unknown as ActivatedRouteSnapshot;

    const state = {} as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => {
      const result = treatmentStateResolver(route, state);

      expect(treatmentsState.setTreatmentPlanId).toHaveBeenCalledWith(123);
      expect(treatmentsState.loadSummary).toHaveBeenCalled();
      expect(treatmentsState.loadTreatmentPlan).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlanState } from '@app/plan/plan.state';
import { PlanService } from '@services';
import { MockProvider } from 'ng-mocks';
import { Plan } from '@types';
import { GeoJSON, Geometry } from 'geojson';

describe('PlanState', () => {
  let planState: PlanState;
  let planService: jasmine.SpyObj<PlanService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlanState,
        MockProvider(PlanService, {
          getPlan: jasmine.createSpy('getPlan'),
        }),
      ],
    });

    planState = TestBed.inject(PlanState);
    planService = TestBed.inject(PlanService) as jasmine.SpyObj<PlanService>;
  });

  it('should call getPlan with the correct ID', () => {
    // Subscribe to trigger the internal pipeline.
    planState.isPlanLoading$.subscribe();

    planService.getPlan.and.returnValue(of({ id: 123 } as Plan));

    planState.setPlanId(123);

    expect(planService.getPlan).toHaveBeenCalledWith('123');
  });

  it('should emit initial false, then true then false in isPlanLoading$', () => {
    planService.getPlan.and.returnValue(of({ id: 1 } as Plan));

    const loadingStates: boolean[] = [];
    const sub = planState.isPlanLoading$.subscribe((val) =>
      loadingStates.push(val)
    );

    planState.setPlanId(1);

    expect(loadingStates).toEqual([false, true, false]);
    sub.unsubscribe();
  });

  it('should emit correct plan in currentPlan$ when getPlan succeeds', () => {
    const mockPlan: Plan = {
      id: 999,
      name: 'Test Plan',
      geometry: { type: 'Point', coordinates: [0, 0] } as Geometry,
    } as Plan;

    planService.getPlan.and.returnValue(of(mockPlan));

    const emittedPlans: Plan[] = [];
    const sub = planState.currentPlan$.subscribe((plan) =>
      emittedPlans.push(plan)
    );

    planState.setPlanId(999);

    expect(emittedPlans.length).toBe(1);
    expect(emittedPlans[0]).toEqual(mockPlan);

    sub.unsubscribe();
  });

  it('should emit geometry from currentPlan in planningAreaGeometry$', () => {
    const mockPlan: Plan = {
      id: 555,
      name: 'Geometry Plan',
      geometry: { type: 'Polygon', coordinates: [] } as Geometry,
    } as Plan;

    planService.getPlan.and.returnValue(of(mockPlan));

    let emittedGeometry: GeoJSON | undefined;
    const sub = planState.planningAreaGeometry$.subscribe(
      (geom) => (emittedGeometry = geom)
    );

    planState.setPlanId(555);

    expect(emittedGeometry).toEqual(mockPlan.geometry);
    sub.unsubscribe();
  });

  it('should emit initial false, then true, then false with error when getPlan fails', () => {
    planService.getPlan.and.returnValue(
      throwError(() => new Error('network error'))
    );

    const loadingStates: boolean[] = [];
    const sub = planState.isPlanLoading$.subscribe((val) =>
      loadingStates.push(val)
    );

    planState.setPlanId(666);

    expect(loadingStates).toEqual([false, true, false]);
    sub.unsubscribe();
  });

  it('should clear cached plan state when resetPlanId() is called (no refetch, loading becomes false)', () => {
    const mockPlan: Plan = {
      id: 42,
      name: 'Plan to Reset',
      geometry: { type: 'Point', coordinates: [1, 2] } as Geometry,
    } as Plan;

    planService.getPlan.and.returnValue(of(mockPlan));

    const emittedPlans: Plan[] = [];
    const planSub = planState.currentPlan$.subscribe((p) =>
      emittedPlans.push(p)
    );

    const loadingStates: boolean[] = [];
    const loadingSub = planState.isPlanLoading$.subscribe((v) =>
      loadingStates.push(v)
    );

    // Load once
    planState.setPlanId(42);

    expect(emittedPlans).toEqual([mockPlan]);
    expect(planService.getPlan).toHaveBeenCalledTimes(1);
    expect(loadingStates).toEqual([false, true, false]);

    // Reset should clear the cached resource (emit isLoading=false),
    // and must NOT call getPlan again.
    planState.resetPlanId();

    expect(planService.getPlan).toHaveBeenCalledTimes(1);
    expect(emittedPlans).toEqual([mockPlan]); // no new plan emission on reset
    expect(loadingStates).toEqual([false, true, false, false]); // extra false from cleared resource

    planSub.unsubscribe();
    loadingSub.unsubscribe();
  });
});

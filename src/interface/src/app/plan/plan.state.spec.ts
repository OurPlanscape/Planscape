import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PlanState, PROCESSING_CHECK_INTERVAL } from './plan.state';
import { AuthService, PlanService, WebSocketService } from '@services';
import { MockProvider } from 'ng-mocks';
import {
  MEMBER_ROLE_CHANGED_EVENT,
  Plan,
  PLANNING_AREA_DATA_EVENTS,
  PLANNING_AREA_MAP_STATUS_EVENT,
  REALTIME_CONNECTED_EVENT,
  WorkspaceEvent,
} from '@types';
import { GeoJSON, Geometry } from 'geojson';

describe('PlanState', () => {
  let planState: PlanState;
  let planService: jasmine.SpyObj<PlanService>;
  let updates$: Subject<WorkspaceEvent | null>;
  let roleChanges$: Subject<WorkspaceEvent<any>>;
  let planUpdates: jasmine.Spy;

  beforeEach(() => {
    updates$ = new Subject();
    roleChanges$ = new Subject();
    planUpdates = jasmine.createSpy('planUpdates$').and.returnValue(updates$);
    TestBed.configureTestingModule({
      providers: [
        PlanState,
        MockProvider(PlanService, {
          getPlan: jasmine.createSpy('getPlan'),
        }),
        MockProvider(WebSocketService, {
          planUpdates$: planUpdates,
          on: (() => roleChanges$) as any,
        }),
        MockProvider(AuthService, {
          currentUser: () => ({ id: 7 }) as any,
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
    expect(loadingStates).toEqual([false, true, false]);

    planSub.unsubscribe();
    loadingSub.unsubscribe();
  });

  describe('keeping the plan current', () => {
    const geometry = { type: 'Polygon', coordinates: [] } as Geometry;
    const plan = {
      id: 1,
      name: 'old name',
      map_status: 'DONE',
      geometry,
    } as Plan;
    const event = (data: Partial<Plan>): WorkspaceEvent => ({
      type: PLANNING_AREA_MAP_STATUS_EVENT,
      object: { kind: 'planning_area', id: 1 },
      data: data as Record<string, unknown>,
    });

    let plans: Plan[];
    let loading: boolean[];
    let geometries: Geometry[];

    function follow(initial = plan) {
      planService.getPlan.and.returnValue(of(initial));
      plans = [];
      loading = [];
      geometries = [];
      planState.currentPlan$.subscribe((p) => plans.push(p));
      planState.isPlanLoading$.subscribe((l) => loading.push(l));
      planState.planningAreaGeometry$.subscribe((g) => geometries.push(g));
      planState.setPlanId(1);
      planService.getPlan.calls.reset();
      loading.length = 0;
    }

    afterEach(() => planState.resetPlanId());

    it('listens to the planning area events of the plan', () => {
      follow();

      expect(planUpdates).toHaveBeenCalledWith(1, PLANNING_AREA_DATA_EVENTS);
    });

    it('merges an event into the plan without a request', () => {
      follow();

      updates$.next(event({ name: 'new name' }));

      expect(plans[plans.length - 1]).toEqual({ ...plan, name: 'new name' });
      expect(planService.getPlan).not.toHaveBeenCalled();
    });

    it('does not report loading or a new geometry for an update', () => {
      follow();

      updates$.next(event({ name: 'new name' }));

      expect(loading).toEqual([]);
      expect(geometries).toEqual([geometry]);
    });

    it('fetches the plan again after every connection', () => {
      follow();
      planService.getPlan.and.returnValue(of({ ...plan, name: 'missed' }));

      updates$.next({ type: REALTIME_CONNECTED_EVENT });

      expect(plans[plans.length - 1].name).toBe('missed');
      expect(geometries.length).toBe(1);
    });

    it('keeps the plan when a background fetch fails', () => {
      follow();
      planService.getPlan.and.returnValue(throwError(() => new Error('nope')));

      updates$.next({ type: REALTIME_CONNECTED_EVENT });
      updates$.next(event({ name: 'still alive' }));

      expect(plans[plans.length - 1].name).toBe('still alive');
    });

    it('ignores the polling fallback when nothing is processing', () => {
      follow();

      updates$.next(null);

      expect(planService.getPlan).not.toHaveBeenCalled();
    });

    it('ignores the polling fallback for oversize plans', () => {
      follow({ ...plan, map_status: 'OVERSIZE' });

      updates$.next(null);

      expect(planService.getPlan).not.toHaveBeenCalled();
    });

    it('uses the polling fallback while the plan is processing', () => {
      follow({ ...plan, map_status: 'IN_PROGRESS' });
      planService.getPlan.and.returnValue(of(plan));

      updates$.next(null);

      expect(plans[plans.length - 1].map_status).toBe('DONE');
    });

    it('lets a slow fetch finish while the polling fallback ticks', () => {
      follow({ ...plan, map_status: 'IN_PROGRESS' });
      const fetched$ = new Subject<Plan>();
      planService.getPlan.and.returnValue(fetched$);

      updates$.next(null);
      updates$.next(null);
      fetched$.next(plan);

      expect(planService.getPlan).toHaveBeenCalledTimes(1);
      expect(plans[plans.length - 1].map_status).toBe('DONE');
    });

    it('polls again once the fetch is done', () => {
      follow({ ...plan, map_status: 'IN_PROGRESS' });
      planService.getPlan.and.returnValue(
        of({ ...plan, map_status: 'IN_PROGRESS' })
      );

      updates$.next(null);
      updates$.next(null);

      expect(planService.getPlan).toHaveBeenCalledTimes(2);
    });

    it('keeps a fetch for a new connection when a timer fires', () => {
      follow();
      const fetched$ = new Subject<Plan>();
      planService.getPlan.and.returnValue(fetched$);

      updates$.next({ type: REALTIME_CONNECTED_EVENT });
      updates$.next(null);
      fetched$.next({ ...plan, name: 'missed' });

      expect(plans[plans.length - 1].name).toBe('missed');
    });

    it('drops a running fetch when an event brings newer data', () => {
      follow();
      const fetched$ = new Subject<Plan>();
      planService.getPlan.and.returnValue(fetched$);

      updates$.next({ type: REALTIME_CONNECTED_EVENT });
      updates$.next(event({ name: 'newer' }));
      fetched$.next({ ...plan, name: 'older' });

      expect(plans[plans.length - 1].name).toBe('newer');
    });

    it('checks on a processing plan in case an event was lost', fakeAsync(() => {
      follow({ ...plan, map_status: 'IN_PROGRESS' });

      tick(PROCESSING_CHECK_INTERVAL);
      expect(planService.getPlan).toHaveBeenCalledTimes(1);

      planState.resetPlanId();
    }));

    it('fetches the plan when my role changes', () => {
      follow();

      roleChanges$.next({
        type: MEMBER_ROLE_CHANGED_EVENT,
        data: { user_id: 7, role: 'VIEWER' },
      });

      expect(planService.getPlan).toHaveBeenCalledTimes(1);
    });

    it('ignores the role changes of others', () => {
      follow();

      roleChanges$.next({
        type: MEMBER_ROLE_CHANGED_EVENT,
        data: { user_id: 8, role: 'VIEWER' },
      });

      expect(planService.getPlan).not.toHaveBeenCalled();
    });

    it('stops following a plan once it is gone', () => {
      follow();

      planState.resetPlanId();

      expect(updates$.observed).toBeFalse();
    });
  });
});

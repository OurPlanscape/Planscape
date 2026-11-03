import { Injectable } from '@angular/core';
import {
  LoadedResult,
  Plan,
  PLANNING_AREA_DATA_EVENTS,
  Resource,
} from '@types';
import { Geometry } from 'geojson';
import {
  BehaviorSubject,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  interval,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { PlanService, WebSocketService } from '@services';

// Events are best effort, so a plan that is still processing checks on itself
export const PROCESSING_CHECK_INTERVAL = 60000;

const PROCESSING_MAP_STATUSES = ['PENDING', 'IN_PROGRESS', 'STANDS_DONE'];

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  constructor(
    private planService: PlanService,
    private webSocketService: WebSocketService
  ) {}

  // The ID of the current plan
  private _currentPlanId$ = new BehaviorSubject<number | null>(null);
  public currentPlanId$ = this._currentPlanId$.asObservable();

  // Listen to ID changes and trigger network calls, returning typed results.
  private currentPlanResource$: Observable<Resource<Plan>> =
    this._currentPlanId$.pipe(
      distinctUntilChanged(),
      switchMap((id) => {
        // clear resource when id is not provided
        if (id == null) {
          return of({ isLoading: false } as Resource<Plan>);
        }

        return concat(
          // when loading emit object with loading
          of({ isLoading: true }),
          this.planService.getPlan(id.toString()).pipe(
            switchMap((plan) => this.followPlan$(plan)),
            map((data) => ({ data, isLoading: false }) as LoadedResult<Plan>),
            // when we have errors, emit object with loading false and error
            catchError((error) => of({ isLoading: false, error: error }))
          )
        );
      }),
      shareReplay(1)
    );

  /**
   * This observable filter currentPlanResource$ to only emit when we have a plan,
   * and we are not loading.
   * Throws error if `currentPlanResource$` has errors
   */
  public currentPlan$ = this.currentPlanResource$.pipe(
    filter((d) => !d.isLoading),
    filter((d) => {
      if (d.error) throw d.error; // throw real errors
      return !!d.data; // only emit when we actually have a plan
    }),
    map((d) => d.data as Plan)
  );

  /**
   * Observable that maps only to loading status.
   */
  public isPlanLoading$ = this.currentPlanResource$.pipe(
    map((d) => d.isLoading),
    distinctUntilChanged()
  );

  /**
   *
   * The Planning Area geometry for the current active plan. It can't be edited,
   * so it only changes along with the plan.
   */
  planningAreaGeometry$ = this.currentPlan$.pipe(
    distinctUntilChanged((a, b) => a.id === b.id),
    map((plan) => plan.geometry as Geometry)
  );

  /**
   * The current plan, or null right away when there is none (or it failed to
   * load), so consumers don't wait on a plan that will never arrive.
   */
  currentPlanOrNull$: Observable<Plan | null> = this._currentPlanId$.pipe(
    distinctUntilChanged(),
    switchMap((id) =>
      id == null ? of(null) : this.currentPlan$.pipe(catchError(() => of(null)))
    ),
    shareReplay(1)
  );

  setPlanId(id: number) {
    this._currentPlanId$.next(id);
  }

  resetPlanId() {
    this._currentPlanId$.next(null);
  }

  /** The plan as it is now, and every change to it from there on. */
  private followPlan$(initial: Plan): Observable<Plan> {
    let plan = initial;
    let fetching = false;

    const fetchPlan$ = defer(() => {
      fetching = true;
      return this.planService.getPlan(initial.id.toString());
    }).pipe(
      // the plan we have is still better than none
      catchError(() => EMPTY),
      finalize(() => (fetching = false))
    );

    const changes$ = merge(
      this.webSocketService.planUpdates$(initial.id, PLANNING_AREA_DATA_EVENTS),
      this.webSocketService.ownRoleChanged$(),
      interval(PROCESSING_CHECK_INTERVAL).pipe(map(() => null))
    ).pipe(
      // null is a timer, which only matters for what events would report, and
      // must not cancel a fetch that is on its way
      filter((update) => !!update || (!fetching && this.isProcessing(plan))),
      switchMap((update) =>
        update?.data && PLANNING_AREA_DATA_EVENTS.includes(update.type)
          ? of({ ...plan, ...update.data } as Plan)
          : fetchPlan$
      )
    );

    return merge(of(initial), changes$).pipe(tap((next) => (plan = next)));
  }

  private isProcessing(plan: Plan): boolean {
    return PROCESSING_MAP_STATUSES.includes(plan.map_status ?? '');
  }
}

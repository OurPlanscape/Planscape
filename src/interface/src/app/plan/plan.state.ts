import { Injectable } from '@angular/core';
import { LoadedResult, Plan, Resource } from '@types';
import { Geometry } from 'geojson';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { PlanService } from '@services';

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  constructor(private planService: PlanService) {}

  // The ID of the current plan
  private _currentPlanId$ = new BehaviorSubject<number | null>(null);
  public currentPlanId$ = this._currentPlanId$.asObservable();

  // BehaviorSubject that we are going to use to manually reload the plan
  private _reloadPlan$ = new BehaviorSubject<void>(undefined);

  // Listen to ID changes and trigger network calls, returning typed results.
  private currentPlanResource$: Observable<Resource<Plan>> = combineLatest([
    this._currentPlanId$.pipe(
      distinctUntilChanged(),
      filter((id): id is number => !!id)
    ),
    this._reloadPlan$,
  ]).pipe(
    switchMap(([id]) => {
      return concat(
        // when loading emit object with loading
        of({ isLoading: true }),
        this.planService.getPlan(id.toString()).pipe(
          // when done, emit object with loading false and data
          map((data) => ({ data, isLoading: false }) as LoadedResult<Plan>),
          // when we have errors, emit object with loading false and error
          catchError((error) => of({ isLoading: false, error: error }))
        )
      );
    }),
    // ensure each new subscriber gets the cached result immediately without re-fetching
    shareReplay(1)
  );

  /**
   * This observable filter currentPlanResource$ to only emit when we have a plan,
   * and we are not loading.
   * Throws error if `currentPlanResource$` has errors
   */
  public currentPlan$ = this.currentPlanResource$.pipe(
    filter((d) => !d.isLoading),
    map((d) => {
      if (d.data) {
        return d.data;
      }
      throw d.error;
    })
  );

  /**
   * Observable that maps only to loading status.
   */
  public isPlanLoading$ = this.currentPlanResource$.pipe(
    map((d) => d.isLoading)
  );

  /**
   *
   * The Planning Area geometry for the current active plan
   */
  planningAreaGeometry$ = this.currentPlan$.pipe(
    map((plan) => plan.geometry as Geometry)
  );

  setPlanId(id: number) {
    this._currentPlanId$.next(id);
  }

  resetPlanId() {
    this._currentPlanId$.next(null);
  }

  reloadPlan() {
    this._reloadPlan$.next();
  }
}

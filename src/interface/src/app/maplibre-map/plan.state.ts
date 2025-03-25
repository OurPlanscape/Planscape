import { Injectable } from '@angular/core';
import { LoadedResult, Plan, Resource } from '@types';
import { Geometry } from 'geojson';
import {
  BehaviorSubject,
  catchError,
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

  // Listen to ID changes and trigger network calls, returning typed results.
  private currentPlanResource$: Observable<Resource<Plan>> =
    this._currentPlanId$.pipe(
      // we might need to tweak this for reloading plans / etc.
      distinctUntilChanged(),
      filter((id): id is number => !!id),
      switchMap((id) => {
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
   */
  public currentPlan$ = this.currentPlanResource$.pipe(
    filter((d): d is LoadedResult<Plan> => !d.isLoading && !!d.data),
    map((d) => d.data)
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
}

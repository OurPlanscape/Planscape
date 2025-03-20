import { Injectable } from '@angular/core';
import { Plan } from '@types';
import { Geometry } from 'geojson';
import {
  BehaviorSubject,
  concat,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';
import { PlanService } from '@services';

@Injectable({
  providedIn: 'root',
})
export class PlanState {
  constructor(private planService: PlanService) {
    // for demo only!
    this.plan$.subscribe((plan) => console.log('my new plan is', plan));
    this.isPlanLoading$.subscribe((loading) =>
      console.log('is plan loading?', loading)
    );
  }

  // we wouldn't use this, see plan$ instead
  private _currentPlan$ = new BehaviorSubject<Plan | null>(null);
  currentPlan$ = this._currentPlan$.asObservable();

  // we'll keep record of the ID
  private _currentPlanId$ = new BehaviorSubject<number | null>(null);

  // maybe we want to keep record of this here to show loaders/interact.
  public isPlanLoading$ = new BehaviorSubject(false);

  // the current plan gets updated when we change the ID and do the network request
  public plan$ = this._currentPlanId$.pipe(
    // we might need to tweak this for reloading plans / etc.
    distinctUntilChanged(),
    filter((id): id is number => !!id),
    switchMap((id) => {
      console.log('about to load plan id', id);
      // Tell the UI we're loading
      this.isPlanLoading$.next(true);

      // emit `null` first so the old plan data is "cleared"
      // then actually fetch the new plan. Once done, turn the loading flag off.
      return concat(
        of(null),
        this.planService
          .getPlan(id.toString())
          .pipe(finalize(() => this.isPlanLoading$.next(false)))
      );
    })
  );

  /**
   *
   * The Planning Area geometry
   */
  planningAreaGeometry$ = this.currentPlan$.pipe(
    filter((plan) => !!plan),
    map((plan) => plan?.geometry as Geometry)
  );

  setCurrentPlan(plan: Plan) {
    this._currentPlan$.next(plan);
  }

  getCurrentPlan(): Plan | null {
    return this._currentPlan$.value;
  }

  getCurrentPlanId(): number {
    const plan = this.getCurrentPlan();
    if (!plan) {
      throw new Error('no plan!');
    }
    return plan.id;
  }

  ///

  setPlanId(id: number) {
    console.log('updating plan id!');
    this._currentPlanId$.next(id);
  }
}

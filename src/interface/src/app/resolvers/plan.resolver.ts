import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import { PlanState } from '../maplibre-map/plan.state';

@Injectable({
  providedIn: 'root',
})
export class PlanResolver implements Resolve<boolean> {
  constructor(private planState: PlanState) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const planId = route.paramMap.get('id') || route.paramMap.get('planId');

    if (planId) {
      this.planState.setPlanId(parseInt(planId, 10));
    }
    // Return true so we don't hold up navigation
    return true;
  }
}

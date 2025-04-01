import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { PlanState } from '../plan/plan.state';

export const planLoaderResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const planState = inject(PlanState);

  const planId = route.paramMap.get('id') || route.paramMap.get('planId');
  if (planId) {
    planState.setPlanId(parseInt(planId, 10));
  }

  // Return true so we don't hold up navigation
  return true;
};

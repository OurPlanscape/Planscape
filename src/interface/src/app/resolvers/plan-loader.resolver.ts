import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { PlanState } from '@app/plan/plan.state';

/**
 * Returns the id of the plan from route params
 * If no planId or invalid id, navigates to route
 */
export const planLoaderResolver: ResolveFn<number> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const planState = inject(PlanState);
  const router = inject(Router);
  const planIdParam = route.paramMap.get('planId') || '';
  const planId = parseInt(planIdParam, 10);

  if (planId) {
    planState.setPlanId(planId);
  } else {
    router.navigate(['/']);
  }

  return planId;
};

/**
 * Resets plan state
 */
export const planResetResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const planState = inject(PlanState);
  planState.resetPlanId();
  // Return true so we don't hold up navigation
  return true;
};

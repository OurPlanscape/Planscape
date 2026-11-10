import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PlanService } from '@services';

const ROOT_PLAN_URL = /^\/(?:plan|map-viewer)\/(\d+)/;

/**
 * Sends the plan pages outside a workspace to the same page inside the plan's
 * workspace, where the realtime connection lives. Plans without a workspace
 * stay where they are, and so does anything the plan page should handle
 * itself, like a plan that doesn't exist.
 */
export const workspacePlanGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const planService = inject(PlanService);
  const planId = state.url.match(ROOT_PLAN_URL)?.[1];
  if (!planId) {
    return true;
  }
  return planService.getPlan(planId).pipe(
    map((plan) =>
      plan.workspace
        ? router.parseUrl(`/workspace/${plan.workspace}${state.url}`)
        : true
    ),
    catchError(() => of(true))
  );
};

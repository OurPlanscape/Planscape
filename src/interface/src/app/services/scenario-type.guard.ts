import { CanActivateFn, Router } from '@angular/router';
import { Scenario } from '@app/types';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { ScenarioState } from '@app/scenario/scenario.state';

export const scenarioTypeRedirectGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const scenarioState = inject(ScenarioState);

  const id = Number(route.paramMap.get('scenarioId')!);

  function isProjectArea(record: Scenario) {
    return record.origin === 'USER';
  }

  return scenarioState.currentScenario$.pipe(
    map((scenario: Scenario) => {
      const isOnProjectRoute = state.url.includes('pa-dashboard');

      const planId = route.paramMap.get('planId') || scenario.planning_area;

      if (isProjectArea(scenario) && !isOnProjectRoute) {
        return router.createUrlTree([
          'plan',
          planId,
          'scenario',
          id,
          'pa-dashboard',
        ]);
      }
      if (!isProjectArea(scenario) && isOnProjectRoute) {
        return router.createUrlTree([
          'plan',
          planId,
          'scenario',
          id,
          'dashboard',
        ]);
      }
      // just proceed - no need to change anything
      return true;
    }),
    catchError(() => {
      // if scenarioId doesn't exist
      return of(router.createUrlTree(['/']));
    })
  );
};

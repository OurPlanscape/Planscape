import { CanActivateFn, Router } from '@angular/router';
import { ScenarioService } from './scenario.service';
import { Scenario } from '@app/types';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

export const scenarioTypeRedirectGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const scenarioService = inject(ScenarioService);

  const id = Number(route.paramMap.get('scenarioId')!);

  function isProjectArea(record: Scenario) {
    return record.origin === 'USER';
  }

  return scenarioService.getScenario(id).pipe(
    map((scenario: Scenario) => {
      const isOnProjectRoute = state.url.includes('/project-area');

      const planId = route.paramMap.get('planId') || scenario.planning_area;

      if (isProjectArea(scenario) && !isOnProjectRoute) {
        return router.createUrlTree([
          'plan',
          planId,
          'project-area',
          id,
          'dashboard',
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

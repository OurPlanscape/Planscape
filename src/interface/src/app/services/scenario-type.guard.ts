import { CanActivateFn, Router } from '@angular/router';
import { ScenarioService } from './scenario.service';
import { Scenario } from '@app/types';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

export const scenarioTypeRedirectGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const scenarioService = inject(ScenarioService); // Access your actual service

  const id = Number(route.paramMap.get('scenarioId')!);

  function isProjectArea(record: Scenario) {
    return record.origin === 'USER';
  }

  return scenarioService.getScenario(id).pipe(
    map((scenario: Scenario) => {
      const isOnProjectRoute = state.url.includes('/project-area');

      const planId = route.paramMap.get('planId') || scenario.planning_area;

      if (isProjectArea(scenario) && !isOnProjectRoute) {
        const rediroute = router.createUrlTree([
          'plan',
          planId,
          'project-area',
          id,
          'dashboard',
        ]);
        return rediroute;
      }
      if (!isProjectArea(scenario) && isOnProjectRoute) {
        const rediroute = router.createUrlTree([
          'plan',
          planId,
          'scenario',
          id,
          'dashboard',
        ]);
        return rediroute;
      }
      return true;
    }),
    catchError(() => {
      // Redirect to error page if scenarioId doesn't exist
      return of(router.createUrlTree(['/404']));
    })
  );
};

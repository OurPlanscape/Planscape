import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { ScenarioState } from '@scenario/scenario.state';
import { getPlanPath } from '@plan/plan-helpers';

export const scenarioLoaderResolver: ResolveFn<number | null> = (
  route: ActivatedRouteSnapshot
) => {
  const scenarioState = inject(ScenarioState);
  const router = inject(Router);
  const planId = route.paramMap.get('planId') ?? '';
  const scenarioIdParam = route.paramMap.get('scenarioId');
  const scenarioId = parseInt(scenarioIdParam!, 10);

  if (!scenarioIdParam || !scenarioId) {
    scenarioState.resetScenarioId();
    router.navigate([getPlanPath(planId, route)]);
    return null;
  }

  scenarioState.setScenarioId(scenarioId);
  return scenarioId ? scenarioId : null;
};

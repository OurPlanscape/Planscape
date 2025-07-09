import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ScenarioState } from '../maplibre-map/scenario.state';

export const scenarioLoaderResolver: ResolveFn<number | null> = (
  route: ActivatedRouteSnapshot
) => {
  const scenarioState = inject(ScenarioState);

  const scenarioIdParam =
    route.paramMap.get('id') || route.paramMap.get('scenarioId') || '';

  const scenarioId = parseInt(scenarioIdParam, 10);
  if (scenarioId) {
    scenarioState.setScenarioId(scenarioId);
  } else {
    scenarioState.resetScenarioId();
  }

  return scenarioId ? scenarioId : null;
};

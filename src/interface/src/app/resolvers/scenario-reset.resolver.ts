import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ScenarioState } from '../maplibre-map/scenario.state';

export const scenarioResetResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot
) => {
  const scenarioState = inject(ScenarioState);

  const scenarioId =
    route.paramMap.get('id') || route.paramMap.get('scenarioId');
  if (!scenarioId) {
    scenarioState.resetScenarioId();
  }

  // Return true so we don't hold up navigation
  return true;
};

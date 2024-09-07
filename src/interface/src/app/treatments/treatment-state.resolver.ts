import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { TreatmentsState } from './treatments.state';
import { MapConfigState } from './treatment-map/map-config.state';

/**
 * Resolver that kickoff loading data via TreatmentsState.
 */
export const treatmentStateResolver: ResolveFn<boolean> = (route, state) => {
  const treatmentsState = inject(TreatmentsState);
  const mapConfig = inject(MapConfigState);

  const paramMap = route.parent?.paramMap;
  if (!paramMap) {
    return false;
  }
  const treatmentPlanId = Number(paramMap.get('treatmentId'));
  const projectAreaId = route.paramMap.get('projectAreaId');
  const scenarioId = Number(paramMap.get('scenarioId'));

  // update config on map, based on route data
  mapConfig.updateShowProjectAreas(route.data['showMapProjectAreas']);
  mapConfig.updateShowTreatmentStands(route.data['showTreatmentStands']);

  treatmentsState.setTreatmentPlanId(treatmentPlanId);
  treatmentsState.setScenarioId(scenarioId);
  treatmentsState.setProjectAreaId(
    projectAreaId ? Number(projectAreaId) : undefined
  );

  treatmentsState.loadSummary();
  treatmentsState.loadTreatmentPlan();
  return true;
};

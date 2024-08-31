import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { TreatmentsState } from './treatments.state';

/**
 * Resolves that kickoff loading data via TreatmentsState.
 * @param route
 * @param state
 */
export const treatmentStateResolver: ResolveFn<boolean> = (route, state) => {
  const treatmentsState = inject(TreatmentsState);
  const treatmentPlanId = Number(route.paramMap.get('treatmentId'));
  const projectAreaId = route.paramMap.get('projectAreaId');

  treatmentsState.loadSummary(
    treatmentPlanId,
    projectAreaId ? Number(projectAreaId) : undefined
  );
  treatmentsState.loadTreatmentPlan(treatmentPlanId);
  return true;
};

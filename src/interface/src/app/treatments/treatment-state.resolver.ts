import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { TreatmentsState } from './treatments.state';

/**
 * Resolver that kickoff loading data via TreatmentsState.
 */
export const treatmentStateResolver: ResolveFn<boolean> = (route, state) => {
  const treatmentsState = inject(TreatmentsState);
  const treatmentPlanId = Number(route.paramMap.get('treatmentId'));
  const projectAreaId = route.paramMap.get('projectAreaId');

  treatmentsState.setTreatmentPlanId(treatmentPlanId);
  treatmentsState.setProjectAreaId(
    projectAreaId ? Number(projectAreaId) : undefined
  );

  treatmentsState.loadSummary();
  treatmentsState.loadTreatmentPlan();
  return true;
};

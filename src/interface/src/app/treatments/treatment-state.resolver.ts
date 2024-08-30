import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { TreatmentsState } from './treatments.state';

export const treatmentStateResolver: ResolveFn<boolean> = (route, state) => {
  const treatmentsState = inject(TreatmentsState);
  const treatmentPlanId = Number(route.paramMap.get('treatmentId'));
  const projectAreaId = route.paramMap.get('projectAreaId');
  console.log(
    'im loading treatment ',
    treatmentPlanId,
    'and project ',
    projectAreaId
  );
  treatmentsState.loadSummary(
    treatmentPlanId,
    projectAreaId ? Number(projectAreaId) : undefined
  );
  return true;
};

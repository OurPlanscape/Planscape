import { ActivatedRouteSnapshot, Data } from '@angular/router';

// Possible routing params
export interface TreatmentRoutingData extends Data {
  scenarioId: number;
  treatmentId?: number;
  projectAreaId?: number;
  planId: number;
  showMapProjectAreas?: boolean;
  showTreatmentStands?: boolean;
  showMapControls?: boolean;
  standSelectionEnabled?: boolean;
}

export function getMergedRouteData(
  route: ActivatedRouteSnapshot
): TreatmentRoutingData {
  const parentData = route.parent?.data || {};
  const childData = route.firstChild?.data || {};
  const currentData = route.data || {};
  const planId = route.params['planId'];

  return {
    ...parentData,
    ...childData,
    ...currentData,
    planId,
  } as TreatmentRoutingData;
}

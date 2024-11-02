import { ActivatedRouteSnapshot, Data } from '@angular/router';

// Possible routing params
export interface TreatmentRoutingData extends Data {
  scenarioId: number;
  treatmentId: number;
  projectAreaId?: number;
  showMapProjectAreas?: boolean;
  showTreatmentStands?: boolean;
  showMapControls?: boolean;
}

export function getMergedRouteData(
  route: ActivatedRouteSnapshot
): TreatmentRoutingData {
  const parentData = route.parent?.data || {};
  const childData = route.firstChild?.data || {};
  const currentData = route.data || {};

  return {
    ...parentData,
    ...childData,
    ...currentData,
  } as TreatmentRoutingData;
}

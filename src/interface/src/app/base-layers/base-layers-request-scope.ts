import { inject } from '@angular/core';
import { Geometry } from 'geojson';
import { map, Observable } from 'rxjs';
import { PlanState } from '@plan/plan.state';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';

/** The planning area and workspace that base layer requests are scoped to. */
export interface BaseLayersRequestScope {
  geometry?: Geometry;
  workspaceId: number | null;
  /** Identifies the scope in the BaseLayersStateService caches. */
  key: string;
}

/** Must be called in an injection context. */
export function injectBaseLayersRequestScope(): Observable<BaseLayersRequestScope> {
  const useGeometry = inject(USE_GEOMETRY);
  const workspaceState = inject(WorkspaceState);
  return inject(PlanState).currentPlanOrNull$.pipe(
    map((plan) => {
      const geometry =
        useGeometry && plan ? (plan.geometry as Geometry) : undefined;
      const workspaceId =
        workspaceState.currentWorkspaceIdValue ?? plan?.workspace ?? null;
      return {
        geometry,
        workspaceId,
        key: `${geometry ? plan?.id : ''}|${workspaceId ?? ''}`,
      };
    })
  );
}

import { Routes } from '@angular/router';
import { workspacePlanGuard } from './workspace-plan.guard';

/**
 * The plan pages at the root, from before they moved under
 * `/workspace/:workspaceId`. Emails and bookmarks still link here, so each one
 * is sent into its plan's workspace.
 *
 * To drop them: delete this folder and its use in `app-routing.module.ts`.
 */
export function legacyPlanRoutes(planRoutes: Routes): Routes {
  return [
    {
      path: 'explore/:planId',
      redirectTo: 'map-viewer/:planId',
      pathMatch: 'full',
    },
    ...planRoutes.map((route) => ({
      ...route,
      canActivate: [workspacePlanGuard, ...(route.canActivate ?? [])],
    })),
  ];
}

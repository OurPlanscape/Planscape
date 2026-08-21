import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { WorkspaceState } from '@app/workspaces/workspace.state';

/**
 * Returns the id of the workspace from route params
 * If no workspaceId or invalid id, navigates to route
 */
export const workspaceLoaderResolver: ResolveFn<number> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const workspaceState = inject(WorkspaceState);
  const router = inject(Router);
  const workspaceIdParam = route.paramMap.get('workspaceId') || '';
  const workspaceId = parseInt(workspaceIdParam, 10);

  if (workspaceId) {
    workspaceState.setWorkspaceId(workspaceId);
  } else {
    router.navigate(['/']);
  }

  return workspaceId;
};

/**
 * Resets workspace state
 */
export const workspaceResetResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const workspaceState = inject(WorkspaceState);
  workspaceState.resetWorkspaceId();
  // Return true so we don't hold up navigation
  return true;
};

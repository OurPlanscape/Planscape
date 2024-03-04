import { PlanPreview } from '../types';

export function canViewCollaborators(plan: PlanPreview) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('view_collaborator');
}

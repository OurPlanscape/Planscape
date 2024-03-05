import { ActualPlan } from '../types';

export function canViewCollaborators(plan: ActualPlan) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('view_collaborator');
}

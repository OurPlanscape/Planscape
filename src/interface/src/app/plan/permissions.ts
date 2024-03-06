import { Plan } from '../types';

export function canViewCollaborators(plan: Plan) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('view_collaborator');
}

import { Plan } from '../types';

export function canViewCollaborators(plan: Plan) {
  return plan.permissions?.includes('view_collaborator');
}

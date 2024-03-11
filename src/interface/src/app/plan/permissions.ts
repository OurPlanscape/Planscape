import { Plan } from '../types';

export function canViewCollaborators(plan: Plan) {
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: Plan) {
  return plan.permissions?.includes('add_scenario');
}

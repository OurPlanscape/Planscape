import { Plan, PlanPreview } from '../types';

export function canViewCollaborators(plan: PlanPreview | Plan) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: PlanPreview | Plan) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('add_scenario');
}

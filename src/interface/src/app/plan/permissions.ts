import { PlanPreview, Plan } from '../types';

export function canViewCollaborators(plan: PlanPreview) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: Plan) {
  if (!plan.permissions) {
    return false;
  }
  return plan.permissions?.includes('add_scenario');
}
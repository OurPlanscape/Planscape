import { Plan, PreviewPlan, User } from '@types';

export function canViewCollaborators(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: Plan) {
  return plan.permissions?.includes('add_scenario');
}

export function canDeletePlanningArea(plan: Plan | PreviewPlan, user: User) {
  return plan.user == user.id;
}

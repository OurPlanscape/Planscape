import { Plan, User } from '@types';

export function canViewCollaborators(plan: Plan) {
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: Plan) {
  return plan.permissions?.includes('add_scenario');
}

export function canDeletePlanningArea(plan: Plan, user: User) {
  return plan.user == user.id;
}

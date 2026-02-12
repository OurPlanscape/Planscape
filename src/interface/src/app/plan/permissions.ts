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

export function canEditPlanName(plan: Plan | PreviewPlan, user: User) {
  return (
    plan.user === user.id || plan.permissions?.includes('change_planning_area')
  );
}

export function canEditScenarioName(plan: Plan | PreviewPlan, user: User) {
  return plan.user === user.id || plan.permissions?.includes('change_scenario');
}

export function userCanAddTreatmentPlan(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('add_tx_plan');
}

export function canEditTreatmentPlan(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('edit_tx_plan');
}

export function canCloneTreatmentPlan(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('clone_tx_plan');
}

export function canDeleteTreatmentPlan(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('remove_tx_plan');
}

export function canRunTreatmentAnalysis(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('run_tx');
}

export function canRunClimateAnalysis(plan: Plan | PreviewPlan, user: User) {
  return (
    plan.user === user.id || plan.permissions?.includes('run_climate_foresight')
  );
}

export function canDeleteClimateAnalysis(plan: Plan | PreviewPlan, user: User) {
  return (
    plan.user === user.id ||
    plan.permissions?.includes('remove_climate_foresight')
  );
}

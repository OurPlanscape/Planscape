import { Plan, PreviewPlan, TreatmentPlan, User } from '@types';

export function canViewCollaborators(plan: Plan | PreviewPlan) {
  return plan.permissions?.includes('view_collaborator');
}

export function canAddScenario(plan: Plan) {
  return plan.permissions?.includes('add_scenario');
}

export function canDeletePlanningArea(plan: Plan | PreviewPlan, user: User) {
  return plan.user == user.id;
}

export type TreatmentPermissionsParams = {
  plan: Plan | PreviewPlan;
  user: User;
  treatmentPlan: TreatmentPlan;
};

export function canCreateTreatmentPlan(opts: TreatmentPermissionsParams) {
  return opts.plan.permissions?.includes('add_tx_plan');
}

export function canDuplicateTreatmentPlan(opts: TreatmentPermissionsParams) {
  return opts.plan.permissions?.includes('clone_tx_plan');
}

export function canDeleteTreatmentPlan(opts: TreatmentPermissionsParams) {
  // todo check with george
  return opts.plan.permissions?.includes('edit_tx_plan');
}

export function canEditTreatmentPlan(opts: TreatmentPermissionsParams) {
  return opts.plan.permissions?.includes('edit_tx_plan');
}

export function runTreatmentPlan(opts: TreatmentPermissionsParams) {
  return opts.plan.permissions?.includes('run_tx');
}

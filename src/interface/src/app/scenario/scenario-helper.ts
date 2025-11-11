import {
  Constraint,
  NamedConstraint,
  Scenario,
  ScenarioCreation,
  ScenarioDraftConfig,
  ScenarioDraftPayload,
  ScenarioGoal,
} from '@types';

/**
 * This method will get a list of scenarioGoal and will return the grouped version of it
 * @param goals : List of scenario goals
 */
export function getGroupedGoals(
  goals: ScenarioGoal[]
): Record<string, Record<string, ScenarioGoal[]>> {
  return goals.reduce<Record<string, Record<string, ScenarioGoal[]>>>(
    (acc, goal) => {
      const groupLabel = goal.group_text;
      const categoryLabel = goal.category_text;

      // Grouping by groupLabel
      if (!acc[groupLabel]) {
        acc[groupLabel] = {};
      }

      // Nesting categories to groups
      if (!acc[groupLabel][categoryLabel]) {
        acc[groupLabel][categoryLabel] = [];
      }

      // Adding the treatment goals
      acc[groupLabel][categoryLabel].push(goal);
      return acc;
    },
    {}
  );
}

/***
 * This function contains the business logic for whether a particular scenario can
 * create a treatment plan.
 *
 */
export function scenarioCanHaveTreatmentPlans(
  scenario: Scenario | undefined
): boolean {
  if (scenario && scenario.capabilities?.includes('IMPACTS')) {
    return true;
  }
  return false;
}

export function convertFlatConfigurationToDraftPayload(
  formData: Partial<ScenarioCreation>,
  thresholdIds: Map<string, number>
): Partial<ScenarioDraftPayload> {
  const payload: Partial<ScenarioDraftPayload> = {};
  const config: Partial<ScenarioDraftConfig> = {};
  if (formData.treatment_goal !== undefined) {
    payload.treatment_goal = formData.treatment_goal;
  }
  if (formData.stand_size !== undefined) {
    config.stand_size = formData.stand_size;
  }
  if (
    formData.excluded_areas !== undefined &&
    Array.isArray(formData.excluded_areas)
  ) {
    config.excluded_areas = Array.from(formData.excluded_areas);
  }
  // targets
  const targets: any = {};
  if (formData.estimated_cost !== undefined) {
    targets.estimated_cost = formData.estimated_cost;
  }
  if (formData.max_area !== undefined) {
    targets.max_area = formData.max_area;
  }
  if (formData.max_budget !== undefined) {
    targets.max_budget = formData.max_budget;
  }
  if (formData.max_project_count !== undefined) {
    targets.max_project_count = formData.max_project_count;
  }
  if (Object.keys(targets).length > 0) {
    config.targets = targets;
  }
  // Constraints
  const constraints: Constraint[] = [];

  const roadLayerId = thresholdIds.get('distance_to_roads');
  if (formData.min_distance_from_road && roadLayerId) {
    constraints.push({
      datalayer: roadLayerId,
      operator: 'lte',
      value: formData.min_distance_from_road,
    });
  }
  const slopeId = thresholdIds.get('slope');
  if (formData.max_slope && slopeId) {
    constraints.push({
      datalayer: slopeId,
      operator: 'lt',
      value: formData.max_slope,
    });
  }

  if (constraints.length > 0) {
    config.constraints = constraints;
  }
  payload.configuration = config;
  return payload;
}

export function getNamedConstraints(
  constraints: Constraint[],
  slopeId: number
): NamedConstraint[] {
  return constraints.map((c) => {
    const name = c.datalayer === slopeId ? 'maxSlope' : 'distanceToRoads';
    return {
      name,
      value: c.value,
      operator: c.operator,
    };
  });
}

export function isScenarioPending(scenario: Scenario) {
  return scenario.scenario_result?.status === 'PENDING';
}

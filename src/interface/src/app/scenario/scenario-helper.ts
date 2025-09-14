import {
  CategorizedScenarioGoals,
  ScenarioConfigPayload,
  ScenarioCreation,
  ScenarioCreationPayload,
  ScenarioGoal,
  Scenario
} from '@types';

/**
 * The idea of this method is: Based on a ScenarioCreation return a ScenarioCreationPayload
 * @param scenario : Scenario creation object
 * @returns a ScenarioCreationPayload ready to send to the backend
 */
export function getScenarioCreationPayloadScenarioCreation(
  scenario: Partial<ScenarioCreation>
): ScenarioCreationPayload {
  const result: Partial<ScenarioCreationPayload> = {
    configuration: {
      estimated_cost: scenario.estimated_cost,
      excluded_areas: scenario.excluded_areas,
      max_area: scenario.max_area,
      max_budget: scenario.max_budget,
      max_slope: scenario.max_slope,
      min_distance_from_road: scenario.min_distance_from_road,
      stand_size: scenario.stand_size,
    } as ScenarioConfigPayload,
    name: scenario.name,
    planning_area: scenario.planning_area,
    treatment_goal: scenario.treatment_goal,
  };
  return result as ScenarioCreationPayload;
}

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

/**
 * This method will get a list of scenarioGoal and will return the categorized version of it
 * TODO: remove this function once CONUS_WIDE_SCENARIOS be removed
 * @param goals : List of scenario goals
 * @deprecated
 */
export function legacyGetCategorizedGoals(
  goals: ScenarioGoal[]
): CategorizedScenarioGoals {
  return goals.reduce<CategorizedScenarioGoals>((acc, goal) => {
    const category = goal.category_text;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(goal);
    return acc;
  }, {});
}

/***
 * This function contains the business logic for whether a particular scenario can
 * create a treatment plan.
 * 
 * e.g., For now, that logic means the scope is not CONUS, but this may change, so 
 * that logic is encapsulated here. 
 * 
 * TODO: This version assumes no backfill, so allows 
 * treatment plan options if the capabilities scope is not present
 */
export function scenarioCanHaveTreatmentPlans(scenario : Scenario) : boolean {
  // scenario must exist AND (scenario either does NOT have a capabilities value OR it does, AND scope is NOT CONUS)
  if (scenario && (!scenario.capabilities.scope || scenario.capabilities?.scope !== 'CONUS')) {
    return true;
  }
  return false;
}

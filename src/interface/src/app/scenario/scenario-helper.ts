import {
  CategorizedScenarioGoals,
  ScenarioConfigPayload,
  ScenarioCreation,
  ScenarioCreationPayload,
  ScenarioGoal,
} from '@types';

/**
 * The idea of this method is: Based on a ScenarioCreation return a ScenarioCreationPayload
 * @param scenario : Scenario creation object
 * @returns a ScenarioCreationPayload ready to send to the backend
 */
export function getScenarioCreationPayloadScenarioCreation(
  scenario: ScenarioCreation
) {
  // TODO: Remove Partial<> once we implemented all steps
  const result: Partial<ScenarioCreationPayload> = {
    configuration: {
      stand_size: scenario.stand_size,
      max_slope: scenario.max_slope,
      min_distance_from_road: scenario.min_distance_from_road,
    } as ScenarioConfigPayload,
    name: scenario.name,
    treatment_goal: scenario.treatment_goal,
    status: 'NOT_STARTED',
    planning_area: scenario.planning_area,
  };
  return result;
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

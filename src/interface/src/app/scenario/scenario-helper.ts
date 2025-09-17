import {
  CategorizedScenarioGoals,
  ScenarioConfigPayload,
  ScenarioCreation,
  ScenarioCreationPayload,
  ScenarioGoal,
  Scenario,
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

// // determine if the config field maps to a collection in the payload
// export function mapToPayloadWithCollections(config: Partial<ScenarioCreation>): ScenarioCreationPayload {

//   /// look at key
//   // for known keys, push them to appropriate collection
//   const constraints = config.constraints ?? [];

//   const newPayload = {
//     configuration: {},
//     name: config.name,
//     planning_area: config.planning_area,
//     treatment_goal: config.treatment_goal,

//     estimated_cost: config.estimated_cost,
//     excluded_areas: config.excluded_areas,
//     max_area: config.max_area,
//     max_budget: config.max_budget,
//     max_slope: config.max_slope,
//     min_distance_from_road: config.min_distance_from_road,
//     stand_size: config.stand_size,

//     excludes: [],
//     includes: [],
//     constraints: constraints, // the constraints for the scenario, like max slope or distance to roads 
//     target: [] //  (max acres treated, max budget, etc)

//   };

//   return newPayload;
// };


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
 */
export function scenarioCanHaveTreatmentPlans(
  scenario: Scenario | undefined
): boolean {
  if (scenario && scenario.capabilities?.includes('IMPACTS')) {
    return true;
  }
  return false;
}

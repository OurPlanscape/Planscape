import {
  ScenarioConfigPayload,
  ScenarioCreation,
  ScenarioCreationPayload,
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

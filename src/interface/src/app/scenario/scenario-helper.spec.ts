import { getScenarioCreationPayloadScenarioCreation } from './scenario-helper';
import { ScenarioCreation } from '@types';

describe('getScenarioCreationPayloadScenarioCreation', () => {
  let mockScenario: ScenarioCreation;

  beforeEach(() => {
    mockScenario = {
      name: 'Test Scenario',
      planning_area: 42,
      treatment_goal: 100,
      estimated_cost: 5000,
      excluded_areas: [1, 2, 3],
      max_area: 200,
      max_slope: 15,
      min_distance_from_road: 5,
      stand_size: 'SMALL',
    };
  });

  it('should map ScenarioCreation to ScenarioCreationPayload with correct fields', () => {
    const result = getScenarioCreationPayloadScenarioCreation(mockScenario);

    expect(result.name).toBe(mockScenario.name);
    expect(result.planning_area).toBe(mockScenario.planning_area);
    expect(result.treatment_goal).toBe(mockScenario.treatment_goal);
    expect(result.status).toBe('NOT_STARTED');
    expect(result.configuration).toEqual({
      stand_size: mockScenario.stand_size,
      max_slope: mockScenario.max_slope,
      min_distance_from_road: mockScenario.min_distance_from_road,
    } as any);
  });

  it('should handle null values for optional fields', () => {
    mockScenario.max_slope = null;
    mockScenario.min_distance_from_road = null;

    const result = getScenarioCreationPayloadScenarioCreation(mockScenario);

    expect(result.configuration?.max_slope).toBeNull();
    expect(result.configuration?.min_distance_from_road).toBeNull();
  });
});

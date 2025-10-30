import {
  getGroupedGoals,
  getScenarioCreationPayloadScenarioCreation,
  convertFlatConfigurationToDraftPayload,
  getNamedConstraints,
} from './scenario-helper';
import { Constraint, ScenarioCreation, ScenarioGoal } from '@types';

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
    expect(result.configuration).toEqual({
      stand_size: mockScenario.stand_size,
      max_slope: mockScenario.max_slope,
      min_distance_from_road: mockScenario.min_distance_from_road,
      estimated_cost: mockScenario.estimated_cost,
      excluded_areas: mockScenario.excluded_areas,
      max_area: mockScenario.max_area,
      max_budget: mockScenario.max_budget,
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

describe('getGroupedGoals', () => {
  const makeGoal = (overrides: Partial<ScenarioGoal> = {}): ScenarioGoal => ({
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Goal',
    description: overrides.description ?? '',
    priorities: overrides.priorities ?? [],
    category: overrides.category ?? 'CAT_KEY',
    category_text: overrides.category_text ?? 'Category Label',
    group: overrides.group ?? 'GRP_KEY',
    group_text: overrides.group_text ?? 'Group Label',
  });

  it('should return an empty object for empty input', () => {
    const result = getGroupedGoals([]);
    expect(result).toEqual({});
  });

  it('should group by group_text and then by category_text', () => {
    const g1 = makeGoal({
      id: 1,
      name: 'G1',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'FIRE_DYNAMICS',
      category_text: 'Fire Dynamics',
    });

    const g2 = makeGoal({
      id: 2,
      name: 'G2',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'FIRE_DYNAMICS',
      category_text: 'Fire Dynamics',
    });

    const g3 = makeGoal({
      id: 3,
      name: 'G3',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'OTHER_CAT',
      category_text: 'Other Category',
    });

    const g4 = makeGoal({
      id: 4,
      name: 'G4',
      group: 'ANOTHER_GROUP',
      group_text: 'Another Group',
      category: 'FIRE_DYNAMICS',
      category_text: 'Fire Dynamics',
    });

    const result = getGroupedGoals([g1, g2, g3, g4]);

    expect(Object.keys(result)).toEqual([
      'California Planning Metrics',
      'Another Group',
    ]);

    expect(Object.keys(result['California Planning Metrics'])).toEqual([
      'Fire Dynamics',
      'Other Category',
    ]);

    expect(result['California Planning Metrics']['Fire Dynamics']).toEqual([
      g1,
      g2,
    ]);
    expect(result['California Planning Metrics']['Other Category']).toEqual([
      g3,
    ]);
    expect(result['Another Group']['Fire Dynamics']).toEqual([g4]);
  });

  it('should not overwrite categories and should append items to the correct bucket', () => {
    const a = makeGoal({
      id: 10,
      group_text: 'Group A',
      category_text: 'Cat 1',
    });
    const b = makeGoal({
      id: 11,
      group_text: 'Group A',
      category_text: 'Cat 2',
    });
    const c = makeGoal({
      id: 12,
      group_text: 'Group A',
      category_text: 'Cat 1',
    });

    const result = getGroupedGoals([a, b, c]);

    expect(result['Group A']['Cat 1']).toEqual([a, c]);
    expect(result['Group A']['Cat 2']).toEqual([b]);
  });

  it('uses the *_text labels as keys (not the raw keys)', () => {
    const goal = makeGoal({
      group: 'GRP_RAW',
      group_text: 'Group Pretty',
      category: 'CAT_RAW',
      category_text: 'Category Pretty',
    });

    const result = getGroupedGoals([goal]);

    expect(result['Group Pretty']).toBeDefined();
    expect(result['Group Pretty']['Category Pretty']).toEqual([goal]);
  });
});

describe('convertFlatConfigurationToDraftPayload', () => {
  const mockThresholdIds = new Map<string, number>([
    ['distance_to_roads', 100],
    ['slope', 200],
  ]);
  it('should return the correct values for standsize and tx goal', () => {
    const formData: Partial<ScenarioCreation> = {
      stand_size: 'LARGE',
      treatment_goal: 1,
    };
    const payloadResult = convertFlatConfigurationToDraftPayload(
      formData,
      mockThresholdIds
    );

    expect(payloadResult).toEqual({
      configuration: { stand_size: 'LARGE' },
      treatment_goal: 1,
    });
  });
  it('should return the correct values for excluded areas', () => {
    const formData: Partial<ScenarioCreation> = {
      excluded_areas: [555, 444, 333],
    };
    const payloadResult = convertFlatConfigurationToDraftPayload(
      formData,
      mockThresholdIds
    );

    expect(payloadResult).toEqual({
      configuration: { excluded_areas: [555, 444, 333] },
    });
  });
  it('should allow the user to set an empty excluded_areas array', () => {
    const formData: Partial<ScenarioCreation> = {
      excluded_areas: [],
    };
    const payloadResult = convertFlatConfigurationToDraftPayload(
      formData,
      mockThresholdIds
    );

    expect(payloadResult).toEqual({
      configuration: { excluded_areas: [] },
    });
  });
  it('should return the correct values for thresholds', () => {
    const formData: Partial<ScenarioCreation> = {
      min_distance_from_road: 100,
      max_slope: 99,
    };
    const payloadResult = convertFlatConfigurationToDraftPayload(
      formData,
      mockThresholdIds
    );
    expect(Array.isArray(payloadResult.configuration?.constraints)).toBe(true);
    expect(payloadResult.configuration?.constraints).toContain({
      datalayer: 100,
      operator: 'lte',
      value: 100,
    });
    expect(payloadResult.configuration?.constraints).toContain({
      datalayer: 200,
      operator: 'lt',
      value: 99,
    });
  });
  it('should return the correct values for targets with maxarea', () => {
    const formData: Partial<ScenarioCreation> = {
      max_area: 43999,
      max_project_count: 10,
      estimated_cost: 2470,
    };
    const payloadResult = convertFlatConfigurationToDraftPayload(
      formData,
      mockThresholdIds
    );

    expect(payloadResult).toEqual({
      configuration: {
        targets: {
          estimated_cost: 2470,
          max_area: 43999,
          max_project_count: 10,
        },
      },
    });
  });
});

describe('getNamedConstraints', () => {
  const slopeId = 10;

  it('should map constraints with matching datalayer to maxSlope', () => {
    const constraints: Constraint[] = [
      { datalayer: 10, operator: 'lt', value: 25 },
      { datalayer: 10, operator: 'lte', value: 30 },
    ];

    const result = getNamedConstraints(constraints, slopeId);

    expect(result).toEqual([
      { name: 'maxSlope', operator: 'lt', value: 25 },
      { name: 'maxSlope', operator: 'lte', value: 30 },
    ]);
  });

  // TODO: This will change if we add more constraints for now we handle just 2
  it('should map constraints with different datalayer to distanceToRoads', () => {
    const constraints: Constraint[] = [
      { datalayer: 20, operator: 'lt', value: 100 },
      { datalayer: 30, operator: 'lte', value: 150 },
    ];

    const result = getNamedConstraints(constraints, slopeId);

    expect(result).toEqual([
      { name: 'distanceToRoads', operator: 'lt', value: 100 },
      { name: 'distanceToRoads', operator: 'lte', value: 150 },
    ]);
  });

  it('should handle a mix of datalayers correctly', () => {
    const constraints: Constraint[] = [
      { datalayer: 10, operator: 'lt', value: 50 },
      { datalayer: 99, operator: 'lte', value: 200 },
    ];

    const result = getNamedConstraints(constraints, slopeId);

    expect(result).toEqual([
      { name: 'maxSlope', operator: 'lt', value: 50 },
      { name: 'distanceToRoads', operator: 'lte', value: 200 },
    ]);
  });
});

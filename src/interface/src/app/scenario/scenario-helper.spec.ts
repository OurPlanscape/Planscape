import {
  getGroupedGoals,
  getScenarioCreationPayloadScenarioCreation,
} from './scenario-helper';
import { ScenarioCreation, ScenarioGoal } from '@types';

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

import {
  convertFlatConfigurationToDraftPayload,
  getGroupedGoals,
  suggestUniqueName,
} from './scenario-helper';
import { ScenarioDraftConfiguration, ScenarioGoal } from '@types';

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
    const formData: Partial<ScenarioDraftConfiguration> = {
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
    const formData: Partial<ScenarioDraftConfiguration> = {
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
    const formData: Partial<ScenarioDraftConfiguration> = {
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
    const formData: Partial<ScenarioDraftConfiguration> = {
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
    const formData: Partial<ScenarioDraftConfiguration> = {
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

describe('suggestUniqueName', () => {
  it('should should name the copy "Copy of <basename>"', () => {
    const origName = 'some name';
    const existingNames = ['a name', 'another name', 'some name'];

    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'some name'");
  });

  it('should append a numeral if the name exists but doesnt end in a numeral', () => {
    const origName = 'some name';
    const existingNames = [
      'a name',
      'another name',
      'some name',
      "Copy of 'some name'",
    ];

    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'some name' 2");
  });

  it('should append a numeral if the name exists with subsequent numbers', () => {
    const origName = 'some name';
    const existingNames = [
      'some name',
      'some name 2',
      "Copy of 'some name'",
      "Copy of 'some name' 2",
      "Copy of 'some name' 3",
      "Copy of 'some name' 4",
      "Copy of 'some name' 5",
    ];

    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'some name' 6");
  });

  it('should increment the trailing number, but only outside the cloned name', () => {
    const origName = 'some name 5';
    const existingNames = [
      'some name',
      "Copy of 'some name 5'",
      "Copy of 'some name 5' 2",
      "Copy of 'some name 5' 3",
      "Copy of 'some name 5' 4",
      "Copy of 'some name 5' 5",
      "Copy of 'some name 5' 6",
      "Copy of 'some name 5' 7",
      "Copy of 'some name 5' 8",
      "Copy of 'some name 5' 9",
    ];

    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'some name 5' 10");
  });

  it('should only increment a number if the name is in "Copy of \'Some Name\'" format', () => {
    const origName = 'Scenario 4567';
    const existingNames = ['Scenario 4567'];
    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'Scenario 4567'");
    existingNames.push("Copy of 'Scenario 4567'");

    const secondNameResult = suggestUniqueName(origName, existingNames);
    expect(secondNameResult).toEqual("Copy of 'Scenario 4567' 2");
  });

  it('should not prepend "Copy of" if that text already exists', () => {
    const origName = "Copy of 'some name' 5";
    const existingNames = [
      'some name',
      "Copy of 'some name'",
      "Copy of 'some name' 2",
      "Copy of 'some name' 3",
      "Copy of 'some name' 4",
      "Copy of 'some name' 5",
      "Copy of 'some name' 6",
      "Copy of 'some name' 7",
      "Copy of 'some name' 8",
      "Copy of 'some name' 9",
    ];

    const nameResult = suggestUniqueName(origName, existingNames);
    expect(nameResult).toEqual("Copy of 'some name' 10");
  });
});

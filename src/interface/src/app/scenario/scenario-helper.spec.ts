import {
  arrayHasChanged,
  convertOldConfigurationToV3Payload,
  getGroupedGoals,
  getResultsTableHeadline,
  sanitizePayloadForScenarioType,
  scenarioHasCapability,
  suggestUniqueName,
} from './scenario-helper';
import {
  Scenario,
  ScenarioDraftConfiguration,
  ScenarioGoal,
  ScenarioV3Payload,
} from '@types';

describe('getGroupedGoals', () => {
  const makeGoal = (overrides: Partial<ScenarioGoal> = {}): ScenarioGoal => ({
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Goal',
    description: overrides.description ?? '',
    priorities: overrides.priorities ?? [],
    category: overrides.category ?? 'Category Label',
    group: overrides.group ?? 'GRP_KEY',
    group_text: overrides.group_text ?? 'Group Label',
  });

  it('should return an empty object for empty input', () => {
    const result = getGroupedGoals([]);
    expect(result).toEqual({});
  });

  it('should group by category only', () => {
    const g1 = makeGoal({
      id: 1,
      name: 'G1',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'Fire Dynamics',
    });

    const g2 = makeGoal({
      id: 2,
      name: 'G2',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'Fire Dynamics',
    });

    const g3 = makeGoal({
      id: 3,
      name: 'G3',
      group: 'CALIFORNIA_PLANNING_METRICS',
      group_text: 'California Planning Metrics',
      category: 'Other Category',
    });

    const g4 = makeGoal({
      id: 4,
      name: 'G4',
      group: 'ANOTHER_GROUP',
      group_text: 'Another Group',
      category: 'Fire Dynamics',
    });

    const result = getGroupedGoals([g1, g2, g3, g4]);

    expect(Object.keys(result)).toEqual(['Fire Dynamics', 'Other Category']);
    expect(result['Fire Dynamics']).toEqual([g1, g2, g4]);
    expect(result['Other Category']).toEqual([g3]);
  });

  it('should not overwrite categories and should append items to the correct bucket', () => {
    const a = makeGoal({
      id: 10,
      group_text: 'Group A',
      category: 'Cat 1',
    });
    const b = makeGoal({
      id: 11,
      group_text: 'Group A',
      category: 'Cat 2',
    });
    const c = makeGoal({
      id: 12,
      group_text: 'Group A',
      category: 'Cat 1',
    });

    const result = getGroupedGoals([a, b, c]);

    expect(result['Cat 1']).toEqual([a, c]);
    expect(result['Cat 2']).toEqual([b]);
  });

  it('uses category as the grouping label', () => {
    const goal = makeGoal({
      group: 'GRP_RAW',
      group_text: 'Group Pretty',
      category: 'Category Pretty',
    });

    const result = getGroupedGoals([goal]);

    expect(result['Group Pretty']).toBeUndefined();
    expect(result['Category Pretty']).toEqual([goal]);
  });
});

describe('convertOldConfigurationToV3Payload', () => {
  const mockThresholdIds = new Map<string, number>([
    ['distance_to_roads', 100],
    ['slope', 200],
  ]);
  it('should return the correct values for standsize and tx goal', () => {
    const formData: Partial<ScenarioDraftConfiguration> = {
      stand_size: 'LARGE',
      treatment_goal: 1,
    };
    const payloadResult = convertOldConfigurationToV3Payload(
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
    const payloadResult = convertOldConfigurationToV3Payload(
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
    const payloadResult = convertOldConfigurationToV3Payload(
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
    const payloadResult = convertOldConfigurationToV3Payload(
      formData,
      mockThresholdIds
    );
    expect(Array.isArray(payloadResult.configuration?.constraints)).toBe(true);
    expect(payloadResult.configuration?.constraints).toContain({
      datalayer: 100,
      operator: 'lte',
      value: '100',
    });
    expect(payloadResult.configuration?.constraints).toContain({
      datalayer: 200,
      operator: 'lt',
      value: '99',
    });
  });
  it('should return the correct values for targets with maxarea', () => {
    const formData: Partial<ScenarioDraftConfiguration> = {
      max_area: 43999,
      max_project_count: 10,
      estimated_cost: 2470,
    };
    const payloadResult = convertOldConfigurationToV3Payload(
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

describe('scenarioHasCapability', () => {
  const scenarioWith = (capabilities?: Scenario['capabilities']): Scenario => ({
    id: 1,
    name: 'scenario',
    planning_area: 1,
    status: 'ACTIVE',
    type: 'PRESET',
    user: 1,
    geopackage_status: 'PENDING',
    geopackage_url: null,
    configuration: {},
    capabilities,
  });

  it('returns true when the capability is present', () => {
    expect(
      scenarioHasCapability(scenarioWith(['FUNDING_REPORT']), 'FUNDING_REPORT')
    ).toBeTrue();
  });

  it('returns false when the capability is absent', () => {
    expect(
      scenarioHasCapability(scenarioWith(['IMPACTS']), 'FUNDING_REPORT')
    ).toBeFalse();
  });

  it('returns false when capabilities is undefined', () => {
    expect(
      scenarioHasCapability(scenarioWith(undefined), 'FUNDING_REPORT')
    ).toBeFalse();
  });

  it('returns false when the scenario is undefined', () => {
    expect(scenarioHasCapability(undefined, 'FUNDING_REPORT')).toBeFalse();
  });
});

describe('sanitizePayloadForScenarioType', () => {
  const baseScenario: Scenario = {
    id: 100,
    name: 'some scenario',
    planning_area: 1,
    status: 'ACTIVE',
    type: 'PRESET',
    user: 1,
    geopackage_status: 'PENDING',
    geopackage_url: 'xxx',
    configuration: {},
  };

  const baseV3Payload: ScenarioV3Payload = {
    configuration: {
      priority_objectives: [1234],
      stand_size: 'MEDIUM',
      excluded_areas: [2984],
      cobenefits: [],
    },
    treatment_goal: 1,
    planning_approach: 'OPTIMIZE_PROJECT_AREAS',
    name: 'test payload',
    planning_area: 1,
  };

  it('should strip empty arrays but keep valid data for a CUSTOM scenario with priority_objectives', () => {
    const customScenario: Scenario = { ...baseScenario, type: 'CUSTOM' };
    const result = sanitizePayloadForScenarioType(
      customScenario,
      baseV3Payload
    );
    // Should keep priority_objectives and excluded_areas
    // Should strip included_areas (because it was [])
    expect(result.configuration).toEqual({
      priority_objectives: [1234],
      stand_size: 'MEDIUM',
      excluded_areas: [2984],
    });
    expect(result.configuration?.cobenefits).toBeUndefined();
  });

  it('should strip configuration to ONLY stand_size for CUSTOM scenario if priority_objectives is empty', () => {
    const customScenario: Scenario = { ...baseScenario, type: 'CUSTOM' };
    const payload: ScenarioV3Payload = {
      ...baseV3Payload,
      configuration: {
        priority_objectives: [],
        stand_size: 'MEDIUM',
        excluded_areas: [1, 2, 3], // This should be lost because objectives are missing
      },
    };
    const result = sanitizePayloadForScenarioType(customScenario, payload);
    // Because it's CUSTOM and objectives are empty, we expect a stripped config
    expect(result.configuration).toEqual({ stand_size: 'MEDIUM' });
    expect(result.configuration?.excluded_areas).toBeUndefined();
  });

  it('should keep cleaned configuration for a PRESET scenario if treatment_goal is present', () => {
    const presetScenario: Scenario = { ...baseScenario, type: 'PRESET' };
    const payload: ScenarioV3Payload = {
      ...baseV3Payload,
      treatment_goal: 1,
      configuration: {
        priority_objectives: [],
        stand_size: 'MEDIUM',
        excluded_areas: [555],
      },
    };
    const result = sanitizePayloadForScenarioType(presetScenario, payload);
    // Goal is present, so we just remove empty arrays
    expect(result.configuration).toEqual({
      stand_size: 'MEDIUM',
      excluded_areas: [555],
    });
    expect(result.configuration?.priority_objectives).toBeUndefined();
  });

  it('should strip configuration for a PRESET scenario if treatment_goal is missing/null', () => {
    const presetScenario: Scenario = { ...baseScenario, type: 'PRESET' };
    const payload: Partial<ScenarioV3Payload> = {
      treatment_goal: undefined, // Missing!
      configuration: {
        stand_size: 'MEDIUM',
        excluded_areas: [999],
      },
    };
    const result = sanitizePayloadForScenarioType(presetScenario, payload);
    expect(result.configuration).toEqual({ stand_size: 'MEDIUM' });
  });

  describe('arrayHasChanged', () => {
    it('should return false when arrays are identical', () => {
      expect(arrayHasChanged([1, 2, 3], [1, 2, 3])).toBeFalse();
    });

    it('should return true when arrays have different lengths', () => {
      expect(arrayHasChanged([1, 2, 3], [1, 2])).toBeTrue();
    });

    it('should return true when arrays contain the same values in a different order', () => {
      expect(arrayHasChanged([1, 2, 3], [3, 2, 1])).toBeTrue();
    });

    it('should return true when at least one value differs', () => {
      expect(arrayHasChanged([1, 2, 3], [1, 2, 4])).toBeTrue();
    });

    it('should return false for two empty arrays', () => {
      expect(arrayHasChanged([], [])).toBeFalse();
    });
  });
});

describe('getResultsTableHeadline', () => {
  it('returns the subunits headline for a top level subunits scenario', () => {
    expect(getResultsTableHeadline('PRIORITIZE_SUB_UNITS', null)).toBe(
      'Top 10 Subunits'
    );
  });

  it('returns the project areas headline for a child of a subunits scenario', () => {
    expect(getResultsTableHeadline('PRIORITIZE_SUB_UNITS', 12)).toBe(
      'Project Areas'
    );
  });

  it('returns the project areas headline for a project areas scenario', () => {
    expect(getResultsTableHeadline('OPTIMIZE_PROJECT_AREAS', null)).toBe(
      'Project Areas'
    );
  });
});

import { isNumber } from '@turf/helpers';
import {
  Constraint,
  Scenario,
  SCENARIO_TYPE,
  ScenarioDraftConfiguration,
  ScenarioGoal,
  ScenarioV3Config,
  ScenarioV3Payload,
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

// TODO this needs to be refactored.
// We should be taking all formData to configuration by default, and treat
// outliers separately, not the other way around.
export function convertFlatConfigurationToDraftPayload(
  formData: Partial<ScenarioDraftConfiguration>,
  thresholdIds: Map<string, number>
): Partial<ScenarioV3Payload> {
  const payload: Partial<ScenarioV3Payload> = {};
  const config: Partial<ScenarioV3Config> = {};
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

  // Custom Scenarios - priority objectives
  if (formData.priority_objectives) {
    config.priority_objectives = formData.priority_objectives;
  }

  // Custom Scenarios - co-benefits
  if (formData.cobenefits) {
    config.cobenefits = formData.cobenefits;
  }

  if (formData.planning_approach) {
    // TODO UPDATE THIS
    payload.planning_approach = formData.planning_approach;
  }

  payload.configuration = config;
  return payload;
}

export function suggestUniqueName(providedName: string, knownNames: string[]) {
  let newName = providedName;
  //wrap in "Copy of '<>'", but only if name doesn't already have that format.
  if (newName.substring(0, 7) !== 'Copy of') {
    newName = `Copy of '${newName}'`;
  }

  //strip any trailing number to get the baseName
  const lastSpace = newName.lastIndexOf(' ');
  let baseName = newName.substring(0, lastSpace);
  const anySuffix = newName.substring(lastSpace);
  if (!isNumber(Number(anySuffix))) {
    // there's no number suffix, so the basename is just the full name
    baseName = newName;
  } //otherwise assume the baseName is just the part before the suffix

  let suggestedName = baseName;
  // any incremented numbering starts with 2
  let i = 2;
  //keep incrementing until we get a unique name
  while (knownNames.includes(suggestedName)) {
    suggestedName = `${baseName} ${i++}`;
  }
  return suggestedName;
}

export function isScenarioPending(scenario: Scenario) {
  return scenario.scenario_result?.status === 'PENDING';
}

export function isCustomScenario(type: SCENARIO_TYPE) {
  return type === 'CUSTOM';
}

 export function isPayloadValidForScenario(scenario:Scenario, payload: Partial<ScenarioV3Payload>) {
    // for PRESET:
    // treatment_goal is required, but cobenefits and priority_objectives are forbidden
    if (scenario.type === 'PRESET') {
      return (scenario.treatment_goal && !payload.configuration?.priority_objectives && !payload.configuration?.cobenefits)
    }
    // for CUSTOM:
    // priority_objectives is required, but treatment_goal is forbidden
    if (scenario.type === 'CUSTOM') {
      return (payload.configuration?.priority_objectives?.length && !scenario.treatment_goal)
    }
    return true;
  }

 export function copyConfigurationToPayload(oldScenario: Scenario, newScenario: Scenario) {
    let newPayload: Partial<ScenarioV3Payload> = {};
    if (oldScenario.version === 'V3') {
      const oldConfig: Partial<ScenarioV3Config> =
        oldScenario.configuration as ScenarioV3Config;
      newPayload = {
        configuration: oldConfig,
      };
    } else if (oldScenario.version === 'V2' || oldScenario.version === 'V1') {
      const oldConfig: Partial<ScenarioV3Config> = oldScenario.configuration;
      const thresholdsIdMap = new Map<string, number>();
      thresholdsIdMap.set('slope', this.thresholdsData.slope?.id);
      thresholdsIdMap.set(
        'distance_to_roads',
        this.thresholdsData.distance_from_roads?.id
      );
      newPayload = convertFlatConfigurationToDraftPayload(
        oldConfig,
        thresholdsIdMap
      );
    }
    if (Number(oldScenario.treatment_goal?.id)) {
      const num = Number(oldScenario.treatment_goal?.id);
      newPayload.treatment_goal = num;
    }
    return newPayload;
  }

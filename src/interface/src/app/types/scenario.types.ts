import { STAND_SIZE } from '@plan/plan-helpers';

export type SCENARIO_STATUS = 'ACTIVE' | 'ARCHIVED';
export type ORIGIN_TYPE = 'USER' | 'SYSTEM';
export type SCENARIO_TYPE = 'PRESET' | 'CUSTOM';

export type ScenarioResultStatus =
  | 'LOADING' // when loading results
  | 'PENDING' // Scenario created, in queue
  | 'RUNNING' // Scenario created, being processed
  | 'SUCCESS' // Run completed successfully
  | 'FAILURE' // Run failed;
  | 'PANIC' // Run failed; panic
  | 'TIMED_OUT'
  | 'DRAFT'; // Creating a scenario but not completed the steps yet.

export type GeoPackageStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | null;

export type Capabilities = 'IMPACTS' | 'FORSYS' | 'CLIMATE_FORESIGHT';

export type PLANNING_APPROACH =
  | 'PRIORITIZE_SUB_UNITS'
  | 'OPTIMIZE_PROJECT_AREAS';

// Backend scenario model returned by /v2/scenarios endpoints.
export interface Scenario {
  id: number;
  name: string;
  notes?: string;
  creator?: string;
  planning_area: number;
  configuration: ScenarioConfig;
  scenario_result?: ScenarioResult;
  status: SCENARIO_STATUS;
  user: number;
  max_treatment_area?: number;
  created_at?: string;
  max_budget?: number;
  tx_plan_count?: number | undefined;
  origin?: ORIGIN_TYPE;
  treatment_goal?: {
    id: string;
    name: string;
  };
  usage_types?: UsageType[];
  version?: string;
  geopackage_status: GeoPackageStatus;
  geopackage_url: string | null;
  capabilities?: Capabilities[];
  type: SCENARIO_TYPE;
  planning_approach?: PLANNING_APPROACH;
}

/**
 * TODO this type is used for the backend payload
 * as well as the frontend interface before saving the scenario.
 * This is bad, as the types are not the same.
 * For example, `treatment_goal` only exists on the FE but does not exists on
 * the backend payload.
 * Similarly, `question_id` only exists on the backend payload, while on the FE side
 * this is part of `treatment_goal`.
 */
// Legacy backend config (V1/V2) stored on Scenario.configuration (flat fields).
export interface ScenarioConfig {
  estimated_cost?: number;
  max_budget?: number;
  max_area?: number | null;
  max_project_count?: number;
  max_slope?: number;
  min_distance_from_road?: number;
  excluded_areas?: number[];
  stand_size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  scenario_priorities?: string[];
  question_id?: number;
  scenario_output_fields?: string[]; // this value comes from saved scenarios
  seed?: number | null;
  priority_objectives?: number[];
  cobenefits?: number[];
}

// Backend scenario run result object.
export interface ScenarioResult {
  status: ScenarioResultStatus;
  completed_at: string;
  result: {
    // this is the FeatureCollection[]
    features: FeatureCollection[]; // TODO this is actually Features[]
    type: string;
  };
}

// Base draft/wizard shape (legacy flat config fields) used by FE draft types.
export interface ScenarioConfigPayload {
  estimated_cost: number;
  excluded_areas: number[];
  max_area: number;
  max_slope: number | null;
  min_distance_from_road: number | null;
  stand_size: STAND_SIZE;
  max_budget?: number;
  max_project_count?: number;
}

// Backend V3 config shape stored on Scenario.configuration for V3 scenarios.
export interface ScenarioV3Config {
  excluded_areas: number[];
  stand_size: STAND_SIZE;
  includes: number[];
  priority_objectives?: number[]; // TODO: ensure this matches up with backend field
  cobenefits?: number[]; // TODO: ensure this matches up with backend field
  constraints: Constraint[]; // the constraints for the scenario, like max slope or distance to roads
  treatment_goal: number;
  targets: {
    estimated_cost: number;
    max_area: number;
    max_project_count: number;
  };
  type?: SCENARIO_TYPE;
  planning_approach?: PLANNING_APPROACH;
}

export interface ScenarioV3Payload {
  configuration: Partial<ScenarioV3Config>;
  name: string;
  planning_area: number;
  treatment_goal: number;
  planning_approach: PLANNING_APPROACH;
}

// TODO is this the right type?
// Backend/analytics GeoJSON feature collection shape for scenario outputs.
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  properties: any;
}

// Backend usage type entry for scenario outputs.
export interface UsageType {
  usage_type: string;
  datalayer: string;
}

// Backend scenario goal metadata.
export interface ScenarioGoal {
  id: number;
  name: string;
  description: string;
  priorities: string[];
  category: string;
  category_text: string;
  group: string;
  group_text: string;
}

// Backend constraint definition (thresholds for stands).
export interface Constraint {
  datalayer: number;
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte';
  value: number; // be supports string
}

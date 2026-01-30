import { STAND_SIZE } from '../plan/plan-helpers';

export type SCENARIO_STATUS = 'ACTIVE' | 'ARCHIVED';
export type ORIGIN_TYPE = 'USER' | 'SYSTEM';
export type SCENARIO_TYPE = 'PRESET' | 'CUSTOM';

export type ScenarioResultStatus =
  | 'LOADING' // when loading results
  | 'NOT_STARTED' // Added by FE when the scenario is not created yet.
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

export interface Scenario {
  id?: number; // undefined when we are creating a new scenario
  name: string;
  notes?: string;
  creator?: string;
  planning_area: number;
  configuration: ScenarioConfig;
  scenario_result?: ScenarioResult;
  status: SCENARIO_STATUS;
  user?: number;
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
export interface ScenarioConfig {
  estimated_cost?: number;
  max_budget?: number;
  max_area?: number | null;
  max_project_count?: number;
  max_slope?: number;
  min_distance_from_road?: number;
  // TODO is this even being used??
  project_areas?: ProjectArea[];
  excluded_areas?: number[];
  stand_size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  scenario_priorities?: string[];
  question_id?: number;
  scenario_output_fields?: string[]; // this value comes from saved scenarios
  seed?: number | null;
  priority_objectives?: number[];
  cobenefits?: number[];
}

export interface ScenarioResult {
  status: ScenarioResultStatus;
  completed_at: string;
  result: {
    // this is the FeatureCollection[]
    features: FeatureCollection[]; // TODO this is actually Features[]
    type: string;
  };
}

export interface ScenarioCreation extends ScenarioConfigPayload {
  treatment_goal: number;
  excluded_areas: number[];
  name: string;
  planning_area: number;
  priority_objectives?: number[];
  cobenefits?: number[];
}

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
}

export interface ScenarioV3Payload {
  configuration: Partial<ScenarioV3Config>;
  name: string;
  planning_area: number;
  treatment_goal: number;
}

export interface ScenarioCreationPayload {
  configuration: ScenarioConfigPayload;
  name: string;
  planning_area: number;
  treatment_goal: number;
}
// TODO is this the right type?
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  properties: any;
}

export interface ProjectArea {
  id: string;
  projectId?: string;
  projectArea: GeoJSON.GeoJSON;
  owner?: string;
  estimatedAreaTreated?: number;
  actualAcresTreated?: number;
}

export interface UsageType {
  usage_type: string;
  datalayer: string;
}

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

export interface Constraint {
  datalayer: number;
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte';
  value: number; // be supports string
}

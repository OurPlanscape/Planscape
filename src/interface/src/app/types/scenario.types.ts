export type SCENARIO_STATUS = 'ACTIVE' | 'ARCHIVED';
export type ORIGIN_TYPE = 'USER' | 'SYSTEM';

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
  version?: string;
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
  treatment_question?: TreatmentQuestionConfig | null;
  excluded_areas?: number[];
  stand_size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  scenario_priorities?: string[];
  question_id?: number;
  scenario_output_fields?: string[]; // this value comes from saved scenarios
  seed?: number | null;
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

export type ScenarioResultStatus =
  | 'LOADING' // when loading results
  | 'NOT_STARTED' // Added by FE when the scenario is not created yet.
  | 'PENDING' // Scenario created, in queue
  | 'RUNNING' // Scenario created, being processed
  | 'SUCCESS' // Run completed successfully
  | 'FAILURE' // Run failed;
  | 'PANIC' // Run failed; panic
  | 'TIMED_OUT'; // Run failed; timed out

export interface TreatmentGoalConfig {
  category_name?: string;
  questions: TreatmentQuestionConfig[];
}

// TODO is this the right type?
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  properties: any;
}

export interface TreatmentQuestionConfig {
  id?: number;
  global_thresholds?: string[];
  long_question_text?: string;
  scenario_output_fields_paths?: {
    [key: string]: string[];
  };
  scenario_priorities?: string[];
  short_question_text?: string;
  stand_thresholds?: string[];
  weights?: number[];

  description?: string[];
}

export interface ProjectArea {
  id: string;
  projectId?: string;
  projectArea: GeoJSON.GeoJSON;
  owner?: string;
  estimatedAreaTreated?: number;
  actualAcresTreated?: number;
}

export interface PriorityRow {
  selected?: boolean;
  visible?: boolean; // Visible as raster data on map
  expanded?: boolean; // Children in table are not hidden
  hidden?: boolean; // Row hidden from table (independent of "visible" attribute)
  disabled?: boolean; // Cannot be selected (because ancestor is selected)
  conditionName: string;
  displayName?: string;
  filepath: string;
  children: PriorityRow[];
  level: number;
}

export interface ScenarioGoal {
  id: number;
  name: string;
  description: string;
  priorities: string[];
  category: string;
  category_text: string;
}

export interface CategorizedScenarioGoals {
  [key: string]: ScenarioGoal[];
}

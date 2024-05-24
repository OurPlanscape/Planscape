export type SCENARIO_STATUS = 'ACTIVE' | 'ARCHIVED';

export interface Scenario {
  id?: string;
  name: string;
  notes?: string;
  creator?: string;
  planning_area: string;
  configuration: ScenarioConfig;
  scenario_result?: ScenarioResult;
  status: SCENARIO_STATUS;
  user?: number;
}

/**
 * TODO this type is used for the backend payload
 * as well as the frontend interface before saving the scenario.
 * This is bad, as the types are not the same.
 * For example, `treatment_question` only exists on the FE but does not exists on
 * the backend payload.
 * Similarly, `question_id` only exists on the backend payload, while on the FE side
 * this is part of `treatment_question`.
 */
export interface ScenarioConfig {
  est_cost?: number;
  max_budget?: number;
  max_slope?: number;
  max_treatment_area_ratio?: number;
  min_distance_from_road?: number;
  // TODO is this even being used??
  project_areas?: ProjectArea[];
  treatment_question?: TreatmentQuestionConfig | null;
  excluded_areas?: string[];
  stand_size?: string;
  scenario_priorities?: string[];
  question_id?: number;
  scenario_output_fields?: string[]; // this value comes from saved scenarios
}

export interface ScenarioResult {
  status: ScenarioResultStatus;
  completed_at: string;
  result: {
    features: FeatureCollection[];
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

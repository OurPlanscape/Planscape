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
 * the backend response for scenario config
 * TODO for now marking several things
 */
export interface ScenarioConfig {
  question_id?: number;
  weights?: any[];
  est_cost?: number;
  max_budget?: number;
  max_slope?: number;
  min_distance_from_road?: number;
  stand_size?: string;
  excluded_areas?: any[];
  stand_thresholds?: string[];
  global_thresholds?: any[];
  scenario_priorities?: string[];
  scenario_output_fields?: string[];
  max_treatment_area_ratio?: number;
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

export interface TreatmentQuestionConfigForScenario
  extends Omit<TreatmentQuestionConfig, 'scenario_output_fields_paths'> {
  scenario_output_fields?: string[];
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

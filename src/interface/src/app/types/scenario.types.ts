export interface Scenario {
  id?: string;
  name: string;
  notes?: string;
  planning_area: string;
  configuration: ScenarioConfig;
  scenario_result?: ScenarioResult;
}

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
  global_thresholds?: string[];
  long_question_text?: string;
  scenario_output_fields_paths?: { [key: string]: string[] };
  scenario_priorities?: string[];
  short_question_text?: string;
  stand_thresholds?: string[];
  weights?: number[];
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

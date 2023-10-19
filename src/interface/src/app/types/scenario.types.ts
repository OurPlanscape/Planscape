export interface Scenario {
  id?: string;
  name: string;
  notes?: string;
  planning_area: string;
  configuration: ScenarioConfig;
  scenario_result?: ScenarioResult;
}

export interface ScenarioConfig {
  created_timestamp?: number;
  est_cost?: number;
  max_budget?: number;
  max_slope?: number;
  max_treatment_area_ratio?: number;
  min_distance_from_road?: number;
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
  | 'FAILURE'; // Run failed;

export interface TreatmentGoalConfig {
  category_name?: string;
  questions: TreatmentQuestionConfig[];
}

// TODO add types to this!
export interface FeatureCollection {
  geometry: any;
  properties: any;
  type: string;
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

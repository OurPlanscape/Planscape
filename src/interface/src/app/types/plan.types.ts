import { Region } from './region.types';

export interface Plan extends BasePlan {
  id: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea?: GeoJSON.GeoJSON;
  createdTimestamp?: number;
  lastUpdated?: Date;
  scenarios?: number;
  configs?: number;
  notes?: string;
}

export interface BasePlan {
  id?: string;
  name: string;
  ownerId: string;
  region: Region;
  scenarios?: number;
  lastUpdated?: Date;
  notes?: string;
  planningArea?: GeoJSON.GeoJSON;
}

export interface PlanPreview {
  id: number;
  name: string;
  notes: string;
  ownerId: number;
  region: Region;
  scenarios: number;
  lastUpdated?: Date;
  geometry?: GeoJSON.GeoJSON;
}

export interface Scenario {
  id?: string;
  name: string;
  notes?: string;
  planning_area: string;
  configuration: ScenarioConfig;
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
}

export interface TreatmentGoalConfig {
  category_name?: string;
  questions: TreatmentQuestionConfig[];
}

export interface TreatmentQuestionConfig {
  global_thresholds?: string[];
  long_question_text?: string;
  scenario_output_fields?: string[];
  scenario_priorities?: string[];
  short_question_text?: string;
  stand_thresholds?: string[];
  weights?: number[];
}

export interface Priority {
  id: string;
  name: string;
  weight: number;
}

export interface ProjectConfig {
  id: number;
  name?: string;
  est_cost?: number;
  max_budget?: number;
  max_treatment_area_ratio?: number;
  min_distance_from_road?: number;
  max_slope?: number;
  priorities?: string[];
  weights?: number[];
  createdTimestamp?: number;
  excluded_areas?: { [key: string]: boolean[] };
}

export interface ProjectArea {
  id: string;
  projectId?: string;
  projectArea: GeoJSON.GeoJSON;
  owner?: string;
  estimatedAreaTreated?: number;
  actualAcresTreated?: number;
}

export interface PlanConditionScores {
  conditions: PlanConditionScore[];
}

export interface PlanConditionScore {
  condition: string;
  mean_score: number;
}

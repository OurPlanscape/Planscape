import { Region } from './region.types';

export interface Plan extends BasePlan {
  id: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea?: GeoJSON.GeoJSON;
  createdTimestamp?: number;
  updatedTimestamp?: number;
  savedScenarios?: number;
  configs?: number;
}

export interface BasePlan {
  id?: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea?: GeoJSON.GeoJSON;
}

export interface PlanPreview {
  id: string;
  name: string;
  createdTimestamp?: number; // in milliseconds since epoch
  region?: Region;
  savedScenarios?: number;
  configurations?: number;
  status?: string;
  geometry?: GeoJSON.GeoJSON;
}

// TODO Replace Project Config
export interface Scenario {
  id: string;
  name: string;
  createdTimestamp?: number; //in milliseconds since epoch
  owner?: string;
  plan_id?: string;
  projectId?: string;
  config: ProjectConfig;
  priorities?: Priority[];
  projectAreas?: ProjectArea[];
  notes?: string;
  favorited?: boolean;
}

export interface ScenarioConfig {
  name: string;
  planning_area: string;
  configuration: ProjectConfig;
}

export interface TreatmentGoalConfig {
  category_name?: string;
  questions: TreatmentQuestionConfig[];
}

export interface TreatmentQuestionConfig {
  long_question_text?: string;
  short_question_text?: string;
  priorities?: string[];
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

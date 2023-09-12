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
  id?: number;
  name: string;
  notes?: string;
  planning_area: string;
  configuration: ScenarioConfig;
}

export interface ScenarioConfig {
  est_cost?: number;
  max_budget?: number;
  max_treatment_area_ratio?: number;
  min_distance_from_road?: number;
  max_slope?: number;
  priorities?: string[];
  weights?: number[];
  projectAreas?: ProjectArea[];
  createdTimestamp?: number;
  excluded_areas?: { [key: string]: boolean[] };
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

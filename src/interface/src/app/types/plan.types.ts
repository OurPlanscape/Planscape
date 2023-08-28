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
}

export interface Scenario {
  id: string;
  createdTimestamp?: number; //in milliseconds since epoch
  owner?: string;
  planId?: string;
  projectId?: string;
  config: ProjectConfig;
  priorities?: Priority[];
  projectAreas?: ProjectArea[];
  notes?: string;
  favorited?: boolean;
}

export interface TreatmentGoalConfig {
  category_name?: string;
  questions: TreatmentQuestionConfig[];
}

export interface TreatmentQuestionConfig {
  question_text?: string;
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
  planId?: number;
  est_cost?: number;
  max_budget?: number;
  max_treatment_area_ratio?: number;
  max_road_distance?: number;
  max_slope?: number;
  priorities?: string[];
  weights?: number[];
  createdTimestamp?: number;
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

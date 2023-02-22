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
  createdTimestamp?: number;  // in milliseconds since epoch
  region?: Region;
  savedScenarios?: number;
  configurations?: number;
  status?: string;
}

export interface Scenario {
  id: string;
  createdTimestamp?: number; //in milliseconds since epoch
}

export interface ProjectConfig {
  id: number;
  max_budget?: number;
  max_treatment_area_ratio?: number;
  max_road_distance?: number;
  max_slope?: number;
  priorities?: string[];
  createdTimestamp? : number;
}

export interface PlanConditionScores {
  conditions: PlanConditionScore[];
}

export interface PlanConditionScore {
  condition: string;
  mean_score: number;
}

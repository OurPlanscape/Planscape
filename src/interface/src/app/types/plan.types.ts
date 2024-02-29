import { Region } from './region.types';

export interface Plan extends BasePlan {
  id: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea?: GeoJSON.GeoJSON;
  createdTimestamp?: Date;
  lastUpdated?: Date;
  scenarios?: number;
  configs?: number;
  notes?: string;
  area_acres: number;
  area_m2: number;
  creator: string;
}

export interface BasePlan {
  id?: string;
  name: string;
  ownerId?: string;
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
  creator?: string;
  area_acres: number;
  area_m2: number;
  role?: string;
  permissions?: string[];
}

export interface BackendPlan {
  id?: number;
  name: string;
  user?: number;
  notes?: string;
  region_name: Region;
  geometry?: GeoJSON.GeoJSON;
  scenario_count?: number;
  projects?: number;
  created_at?: string;
  latest_updated?: string;
  area_acres?: number;
  area_m2?: number;
  creator?: string;
}

export interface BackendPlanPreview {
  id: number;
  name: string;
  notes: string;
  user: number;
  region_name: Region;
  scenario_count: number;
  latest_updated: string;
  geometry?: GeoJSON.GeoJSON;
  creator?: string;
  area_acres: number;
  area_m2: number;
  role?: string;
  permissions?: string[];
}

export interface BackendProjectArea {
  id: number;
  geometry: GeoJSON.GeoJSON;
  properties?: {
    estimated_area_treated?: number;
    owner?: number;
    project?: number;
  };
}

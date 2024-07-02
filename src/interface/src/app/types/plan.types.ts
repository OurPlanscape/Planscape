import { Region } from './region.types';

export interface Plan {
  area_acres: number;
  area_m2: number;
  created_at: string;
  creator: string;
  geometry?: GeoJSON.GeoJSON;
  id: number;
  latest_updated?: string;
  name: string;
  notes?: string;
  permissions: string[];
  region_name: Region;
  role: string;
  scenario_count: number;
  user: number;
}

export type PreviewPlan = Omit<Plan, 'geometry' | 'area_m2'>;

export interface CreatePlanPayload {
  geometry: GeoJSON.GeoJSON;
  name: string;
  region_name: Region;
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

export interface Creator {
  id: number;
  email: string;
  full_name: string;
}

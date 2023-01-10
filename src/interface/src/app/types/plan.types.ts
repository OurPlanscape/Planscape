import { Region } from './region.types';

export interface Plan extends BasePlan {
  id: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea?: GeoJSON.GeoJSON;
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
  status?: string;
}

export interface Scenario {
  id: string;
  createdTimestamp: number; //in milliseconds since epoch
}

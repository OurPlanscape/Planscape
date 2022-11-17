import { Region } from "./region.types";

export interface Plan extends BasePlan {
  id: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea: GeoJSON.GeoJSON;
}

export interface BasePlan {
  id?: string;
  name: string;
  ownerId: string;
  region: Region;
  planningArea: GeoJSON.GeoJSON;
}

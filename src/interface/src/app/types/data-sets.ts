import { Geometry } from 'geojson';
import {
  BrowseDataLayer,
  Dataset,
  MapTypeEnum,
} from '@api/planscapeAPI.schemas';
import { IdNamePair } from './general';

// Re-exported under a friendlier name for the UI-side legend code.
export type RasterColorType = MapTypeEnum;

// Minimal dataset shape the data-layers UI deals with — id + name +
// organization. Derived from the generated `Dataset` so it stays in sync.
export type BaseDataSet = Pick<Dataset, 'id' | 'name' | 'organization'>;

// Loose JSON shape for `DataLayer.metadata`. The backend declares this as
// `OpenApiTypes.OBJECT` (no inner schema) and consumers do dynamic key
// access — keeping `Metadata` as `Record<string, any>` instead of pretending
// to know the keys.
export type Metadata = Record<string, any>;

// UI-only — derived legend entry rendered by the color legend component.
export interface LayerStyleEntry {
  colorHex: string;
  entryLabel: string;
}

// Vector base layer used by the base-layers state. Sourced from the
// `datasets/{id}/browse` endpoint (generated `BrowseDataLayer`) and cast to
// this narrower shape — `map_url` is non-nullable here because base layers are
// only displayed once they have a tile URL, and `styles[0].data` is treated as
// a string-keyed style dict (fill-color, fill-outline-color, etc.).
export interface BaseLayer {
  id: number;
  organization: IdNamePair;
  dataset: IdNamePair;
  path: string[];
  name: string;
  type: string;
  geometry_type: string;
  status: string;
  info: Record<string, unknown> | null;
  metadata: Metadata | null;
  map_url: string;
  storage_type?: string;
  styles: [
    {
      id?: number;
      data: {
        [key: string]: string;
      };
    },
  ];
  map_service_type: 'VECTORTILES' | 'COG' | 'ESRI_GEOJSON';
}

export interface ColorLegendInfo {
  title: string;
  type: RasterColorType;
  entries: LayerStyleEntry[];
}

export interface SearchResult {
  id: number;
  name: string;
  type: 'DATASET' | 'DATALAYER';
  url: string;
  data: BrowseDataLayer | Dataset;
}

export interface SearchQuery {
  term: string;
  limit: number;
  offset?: number;
  module?: string;
  geometry?: Geometry;
}

export interface DataSetSearchResult extends SearchResult {
  type: 'DATASET';
  data: Dataset;
}

export interface DataLayerSearchResult extends SearchResult {
  type: 'DATALAYER';
  data: BrowseDataLayer;
}

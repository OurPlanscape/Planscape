import { Geometry } from 'geojson';
import { BrowseDataLayer, Dataset } from '@api/planscapeAPI.schemas';
import { IdNamePair } from './general';

export type RasterColorType = 'RAMP' | 'INTERVALS' | 'VALUES';

// Minimal dataset shape the data-layers UI deals with — id + name +
// organization. Derived from the generated `Dataset` so it stays in sync.
export type BaseDataSet = Pick<Dataset, 'id' | 'name' | 'organization'>;

export interface InfoStats {
  max: number;
  min: number;
  std: number;
  mean: number;
}

// Shape of `DataLayer.info` for raster layers (the JSONified output of
// gdalinfo). Vector layers store ogrinfo output here, which has a totally
// different shape. Use as a narrowing cast: `(layer.info as RasterInfo | null)`
// at sites that have already established the layer is a raster.
export interface RasterInfo {
  crs: string;
  res: number[];
  count: number;
  dtype: string;
  shape: number[];
  stats: InfoStats[];
  tiled: boolean;
  units: Array<string | null>;
  width: number;
  bounds: number[];
  driver: string;
  height: number;
  lnglat: number[];
  nodata: number;
  indexes: number[];
  checksum: number[];
  compress: string;
  transform: number[];
  blockxsize: number;
  blockysize: number;
  interleave: string;
  mask_flags: string[][];
  colorinterp: string[];
  descriptions: Array<string | null>;
}

export interface Metadata {
  // Add specific fields once we start using this
  [key: string]: any;

  modules?: {
    map?: any;
    toc?: any;
    forsys?: { capabilities: string[] };
  };
  map?: {
    arcgis?: any;
  };
}

export interface LayerStyleEntry {
  colorHex: string;
  entryLabel: string;
}

export interface NoData {
  values: number[];
  color?: string;
  opacity?: number;
  label?: string;
}

export interface Entry {
  value: number;
  color: string;
  opacity?: number;
  label?: string | null;
}

export interface StyleJson {
  map_type: RasterColorType;
  no_data?: NoData;
  entries: Entry[];
}

export interface Styles {
  id: number;
  data: StyleJson;
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

import { Geometry } from 'geojson';

export type RasterColorType = 'RAMP' | 'INTERVALS' | 'VALUES';

export interface DataSet {
  id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: number;
  organization: IdNamePair;
  name: string;
  description: string | null;
  visibility: string;
  version: string;
}

export interface IdNamePair {
  id: number;
  name: string;
}

export interface InfoStats {
  max: number;
  min: number;
  std: number;
  mean: number;
}

export interface Info {
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
  modules?: { map? : any },
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

export interface DataLayer {
  id: number;
  organization: IdNamePair;
  dataset: IdNamePair;
  path: string[]; // Array of category names describing the tree path
  name: string;
  type: string;
  geometry_type: string;
  status: string;
  info: Info;
  metadata: Metadata | null;
  styles: Styles[];
  geometry: Geometry;
  public_url: string;

  map_service_type: 'VECTORTILES' | 'COG' | 'ESRI_GEOJSON';
}

export interface BaseLayer extends Omit<DataLayer, 'public_url' | 'styles'> {
  // base layers have only one path/category.
  path: [string];
  map_url: string;
  styles: [
    {
      data: {
        [key: string]: string;
      };
    },
  ];
}

export interface CategorizedBaseLayers {
  category: {
    name: string;
    isMultiSelect: boolean;
  };
  layers: BaseLayer[];
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
  data: DataLayer | DataSet;
}

export interface DataSetSearchResult extends SearchResult {
  type: 'DATASET';
  data: DataSet;
}

export interface DataLayerSearchResult extends SearchResult {
  type: 'DATALAYER';
  data: DataLayer;
}

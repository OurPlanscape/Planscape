import { NONE_COLORMAP } from './legend.types';

export interface BoundaryConfig {
  display_name?: string;
  boundary_name: string;
  vector_name: string;
  shape_name: string;
  region_name?: string;
}

export interface ConditionsConfig extends DataLayerConfig {
  region_name?: string;
  region_geoserver_name?: string;
  pillars?: PillarConfig[];
  raw_data?: boolean;
  translated_data?: boolean;
  future_data?: boolean;
}

export interface ConditionsMetadata {
  data_download_link?: string;
  data_provider?: string;
  data_year?: string;
  reference_link?: string;
  source?: string;
  source_link?: string;
  min_value?: number;
  max_value?: number;
}

export interface DataLayerConfig extends ConditionsMetadata {
  display_name?: string;
  legend_name?: string;
  data_units?: string;
  region_geoserver_name?: string;
  filepath?: string;
  normalized_data_download_path?: string;
  layer?: string;
  raw_layer?: string;
  normalized_layer?: string;
  colormap?: string;
  normalized?: boolean;
  opacity?: number;
}

export interface ElementConfig extends DataLayerConfig {
  display?: boolean;
  element_name?: string;
  metrics?: MetricConfig[];
}

export interface MetricConfig extends DataLayerConfig {
  metric_name: string;
  data_units?: string;
  output_units?: string;
  raw_data_download_path?: string;
}

export interface PillarConfig extends DataLayerConfig {
  display?: boolean;
  pillar_name?: string;
  elements?: ElementConfig[];
  future_layer?: string;
  future_data_download_path?: string;
}

export enum ConditionTreeType {
  RAW = 'Raw',
  TRANSLATED = 'Translated',
  FUTURE = 'Future',
}

export const NONE_BOUNDARY_CONFIG: BoundaryConfig = {
  boundary_name: '',
  display_name: 'None',
  vector_name: '',
  shape_name: 'None',
};

export const NONE_DATA_LAYER_CONFIG: DataLayerConfig = {
  display_name: 'None',
  filepath: '',
  layer: '',
  colormap: NONE_COLORMAP,
};

export enum FormMessageType {
  SUCCESS,
  ERROR,
  ALERT,
}

export interface Pagination<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

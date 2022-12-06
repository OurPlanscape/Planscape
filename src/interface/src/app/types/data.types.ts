export interface BoundaryConfig {
  display_name?: string;
  boundary_name: string;
}

export interface ConditionsConfig extends DataLayerConfig {
  region_name?: string;
  pillars?: PillarConfig[];
}

export interface DataLayerConfig {
  display_name?: string;
  filepath?: string;
  colormap?: string;
  normalized?: boolean;
}

export interface ElementConfig extends DataLayerConfig {
  element_name?: string;
  metrics?: MetricConfig[];
}

export interface MetricConfig extends DataLayerConfig {
  metric_name: string;
}

export interface PillarConfig extends DataLayerConfig {
  display?: boolean;
  pillar_name?: string;
  elements?: ElementConfig[];
}

export const NONE_BOUNDARY_CONFIG: BoundaryConfig = {
  boundary_name: '',
  display_name: 'None',
};

export const NONE_DATA_LAYER_CONFIG: DataLayerConfig = {
  display_name: 'None',
  filepath: '',
};

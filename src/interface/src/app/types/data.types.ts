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

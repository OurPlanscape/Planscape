export interface ConditionsConfig {
  display_name?: string;
  filepath?: string;
  region_name?: string;
  pillars?: PillarConfig[];
  colormap?: string;
}

export interface ElementConfig {
  display_name?: string;
  element_name?: string;
  filepath?: string;
  metrics?: MetricConfig[];
  colormap?: string;
}

export interface MetricConfig {
  metric_name: string;
  filepath: string;
  display_name?: string;
  colormap?: string;
}

export interface PillarConfig {
  display_name?: string;
  display?: boolean;
  pillar_name?: string;
  filepath?: string;
  elements?: ElementConfig[];
  colormap?: string;
}

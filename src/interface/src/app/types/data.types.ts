export interface ConditionsConfig {
  display_name: string;
  filepath: string;
  region_name: string;
  pillars: PillarConfig[];
}

export interface ElementConfig {
  display_name: string;
  element_name: string;
  filepath: string;
  metrics: MetricConfig[];
}

export interface MetricConfig {
  metric_name: string;
  filepath: string;
  display_name: string;
}

export interface PillarConfig {
  display_name: string;
  pillar_name: string;
  filepath: string;
  elements: ElementConfig[];
}

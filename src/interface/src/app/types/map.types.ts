import { BaseLayerType } from './layer.types';
import * as L from 'leaflet';
import { MetricConfig } from './data.types';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  boundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.Layer | undefined;
}

export interface MapConfig {
  baseLayerType: BaseLayerType;
  dataLayerConfig: MetricConfig;
  showDataLayer: boolean;
  normalizeDataLayer: boolean;
  showExistingProjectsLayer: boolean;
  boundaryLayerName: string | null;
}


export interface MapViewOptions {
  selectedMapIndex: number;
  numVisibleMaps: number;
}

export function defaultMapConfig(): MapConfig {
  return {
    baseLayerType: BaseLayerType.Road,
    dataLayerConfig: {
      metric_name: '',
      filepath: '',
    },
    showDataLayer: false,
    normalizeDataLayer: false,
    showExistingProjectsLayer: false,
    boundaryLayerName: null,
  };
}

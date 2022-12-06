import { BaseLayerType } from './layer.types';
import * as L from 'leaflet';
import { MetricConfig } from './data.types';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  huc12BoundaryLayerRef?: L.Layer | undefined;
  huc10BoundaryLayerRef?: L.Layer | undefined;
  countyBoundaryLayerRef?: L.Layer | undefined;
  usForestBoundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.Layer | undefined;
  clonedDrawingRef?: L.FeatureGroup | undefined;
  drawnPolygonLookup?: {[key: string]:L.Layer};
}

export interface MapConfig {
  baseLayerType: BaseLayerType;
  dataLayerConfig: MetricConfig;
  showDataLayer: boolean;
  normalizeDataLayer: boolean;
  showExistingProjectsLayer: boolean;
  showHuc12BoundaryLayer: boolean;
  showHuc10BoundaryLayer: boolean;
  showCountyBoundaryLayer: boolean;
  showUsForestBoundaryLayer: boolean;
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
    showHuc12BoundaryLayer: false,
    showHuc10BoundaryLayer: false,
    showCountyBoundaryLayer: false,
    showUsForestBoundaryLayer: false,
  };
}

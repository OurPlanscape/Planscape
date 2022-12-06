import { BaseLayerType } from './layer.types';
import * as L from 'leaflet';
import { BoundaryConfig, DataLayerConfig } from './data.types';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  boundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.Layer | undefined;
  clonedDrawingRef?: L.FeatureGroup | undefined;
  drawnPolygonLookup?: {[key: string]:L.Layer};
}

export interface MapConfig {
  baseLayerType: BaseLayerType;
  boundaryLayerConfig: BoundaryConfig;
  dataLayerConfig: DataLayerConfig;
  showExistingProjectsLayer: boolean;
}


export interface MapViewOptions {
  selectedMapIndex: number;
  numVisibleMaps: number;
}

export function defaultMapConfig(): MapConfig {
  return {
    baseLayerType: BaseLayerType.Road,
    boundaryLayerConfig: {
      boundary_name: '',
    },
    dataLayerConfig: {
      display_name: 'None',
      filepath: '',
    },
    showExistingProjectsLayer: false,
  };
}

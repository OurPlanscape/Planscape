import * as L from 'leaflet';

import {
  BaseLayerType,
  BoundaryConfig,
  DataLayerConfig,
  Region,
  NONE_BOUNDARY_CONFIG,
  NONE_DATA_LAYER_CONFIG,
} from '../types';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  boundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.TileLayer | undefined;
  clonedDrawingRef?: L.FeatureGroup | undefined;
  drawnPolygonLookup?: { [key: string]: L.Layer };
  legend?: HTMLElement | undefined;
  regionLayerRef?: L.Layer | undefined;
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
  zoom: number;
  center: L.LatLngExpression;
}

export function defaultMapConfig(): MapConfig {
  return {
    baseLayerType: BaseLayerType.Road,
    boundaryLayerConfig: NONE_BOUNDARY_CONFIG,
    dataLayerConfig: NONE_DATA_LAYER_CONFIG,
    showExistingProjectsLayer: false,
  };
}

export function defaultMapViewOptions(): MapViewOptions {
  return {
    selectedMapIndex: 0,
    numVisibleMaps: 4,
    zoom: 9,
    center: [38.646, -120.548],
  };
}

export function defaultMapConfigsDictionary(): Record<Region, MapConfig[]> { 
  return {
    [Region.SIERRA_NEVADA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.SOUTHERN_CALIFORNIA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.NORTHERN_CALIFORNIA] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
    [Region.CENTRAL_COAST] : [defaultMapConfig(), defaultMapConfig(), defaultMapConfig(), defaultMapConfig()],
  };
}

export const FrontendConstants = {
  MAP_INITIAL_ZOOM: 9,
  MAP_MIN_ZOOM: 7,
  MAP_MAX_ZOOM: 13,
  MAP_DATA_LAYER_OPACITY: 0.7,
} as const;

export function regionMapCenters(region: Region): L.LatLngTuple {
  // TODO Confirm center coordinates for new regions (northern, central, southern)
  switch (region) {
    case Region.SIERRA_NEVADA:
      return [38.646, -120.548];
    case Region.NORTHERN_CALIFORNIA:
      return [39.703, -123.313];
    case Region.CENTRAL_COAST:
      return [36.598, -121.896];
    case Region.SOUTHERN_CALIFORNIA:
      return [34.0522, -118.243];
    default:
      // Defaults to Sierra Nevada center
      return [38.646, -120.548];
  };
}

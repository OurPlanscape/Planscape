import * as L from 'leaflet';

import { BaseLayerType, BoundaryConfig, DataLayerConfig } from '@types';
import * as esri from 'esri-leaflet';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  boundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: esri.FeatureLayer | undefined;
  dataLayerRef?: L.TileLayer | undefined;
  clonedDrawingRef?: L.FeatureGroup | undefined;
  drawnPolygonLookup?: { [key: string]: L.Layer };
  legend?: HTMLElement | undefined;
  regionLayerRef?: L.GeoJSON | undefined;
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
  center: L.LatLngTuple;
}

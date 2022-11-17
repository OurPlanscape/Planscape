import { BaseLayerType } from './layer.types';
import * as L from 'leaflet';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  HUC12BoundaryLayerRef?: L.Layer | undefined;
  huc10BoundaryLayerRef?: L.Layer | undefined;
  countyBoundaryLayerRef?: L.Layer | undefined;
  usForestBoundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.Layer | undefined;
}

export interface MapConfig {
  baseLayerType: BaseLayerType;
  showExistingProjectsLayer: boolean;
  showHUC12BoundariesLayer: boolean;
  showHuc10BoundaryLayer: boolean;
  showCountyBoundariesLayer: boolean;
  showUsForestBoundaryLayer: boolean;
  showDataLayer: boolean;
}

import { BaseLayerType } from './layer.types';
import * as L from 'leaflet';

export interface Map {
  id: string;
  name: string;
  config: MapConfig;
  instance?: L.Map | undefined;
  baseLayerRef?: L.Layer | undefined;
  HUC12BoundaryLayerRef?: L.Layer | undefined;
  countyBoundaryLayerRef?: L.Layer | undefined;
  existingProjectsLayerRef?: L.Layer | undefined;
  dataLayerRef?: L.Layer | undefined;
}

export interface MapConfig {
  baseLayerType: BaseLayerType;
  showExistingProjectsLayer: boolean;
  showHUC12BoundariesLayer: boolean;
  showCountyBoundariesLayer: boolean;
  showDataLayer: boolean;
}

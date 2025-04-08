import * as L from 'leaflet';

export enum AreaCreationAction {
  NONE = 0,
  DRAW = 1,
  UPLOAD = 2,
}

export const LEGEND = {
  labels: [
    'Highest',
    'Higher',
    'High',
    'Mid-high',
    'Mid-low',
    'Low',
    'Lower',
    'Lowest',
  ],
  colors: [
    '#f65345',
    '#e9884f',
    '#e5ab64',
    '#e6c67a',
    '#cccfa7',
    '#a5c5a6',
    '#74afa5',
    '#508295',
  ],
};

export const NORMAL_STYLES: L.PathOptions = {
  color: '#000000',
  weight: 1,
  opacity: 0.5,
};

export const HOVER_STYLES: L.PathOptions = {
  color: '#ff0000',
  weight: 5,
  opacity: 0.9,
};

export const DRAWING_STYLES: L.PathOptions = {
  color: '#000',
  fillColor: '#A5C8D7',
  fillOpacity: 0.25,
  weight: 2,
};

export const BOUNDARY_LAYER_NORMAL_STYLES: L.PathOptions = {
  weight: 1,
  color: '#0000ff',
  fillOpacity: 0,
  fill: true,
};

export const BOUNDARY_LAYER_HOVER_STYLES: L.PathOptions = {
  weight: 5,
  color: '#0000ff',
  fillOpacity: 0.5,
  fill: true,
};
export const FrontendConstants = {
  LEAFLET_MAP_INITIAL_ZOOM: 9,
  LEAFLET_MAP_MIN_ZOOM: 7,
  LEAFLET_MAP_MAX_ZOOM: 18,
  LEAFLET_MAP_DATA_LAYER_OPACITY: 0.7,

  MAPLIBRE_MAP_INITIAL_ZOOM: 9,
  MAPLIBIRE_MAP_MIN_ZOOM: 7,
  MAPLIBRE_MAP_MAX_ZOOM: 17,
  MAPLIBRE_MAP_DATA_LAYER_OPACITY: 0.75,
  MAPLIBRE_MAP_DATA_LAYER_TILESIZE: 512,
} as const;

import { MatSnackBarConfig } from '@angular/material/snack-bar';
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

export const TERRAIN_TILES = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 13,
    attribution:
      'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS',
    zIndex: 0,
  }
);

export const ROAD_TILES = L.tileLayer(
  'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    zIndex: 0,
  }
);

export const SATELLITE_TILES = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    zIndex: 0,
  }
);

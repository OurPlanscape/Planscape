import * as L from 'leaflet';
import { BaseLayerType, Map } from '@types';

/** Creates a basemap layer using the Esri.WorldTerrain tiles. */
export function terrainTiles() {
  return L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    {
      maxNativeZoom: 13,
      attribution:
        'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS',
      zIndex: 0,
    }
  );
}

/** Creates a basemap layer using the Stadia.AlidadeSmooth tiles. */
export function stadiaAlidadeTiles() {
  return L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      zIndex: 0,
    }
  );
}

/** Creates a basemap layer using the Esri.WorldImagery tiles. */
export function satelliteTiles() {
  return L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      zIndex: 0,
    }
  );
}

export function changeMapBaseStyle(map: Map) {
  let baseLayerType = map.config.baseLayerType;
  map.baseLayerRef?.remove();
  if (baseLayerType === BaseLayerType.Terrain) {
    map.baseLayerRef = terrainTiles();
  } else if (baseLayerType === BaseLayerType.Road) {
    map.baseLayerRef = stadiaAlidadeTiles();
  } else if (baseLayerType === BaseLayerType.Satellite) {
    map.baseLayerRef = satelliteTiles();
  }
  map.instance?.addLayer(map.baseLayerRef!);
}

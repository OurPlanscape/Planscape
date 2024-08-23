import { BehaviorSubject, map } from 'rxjs';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MapOptions } from 'maplibre-gl';

type StadiaBaseMap = 'stadiaSmooth' | 'stamenTerrain' | 'stadiaSatellite';
type ArcgisBaseMap = 'arcgisTopographic' | 'arcgisImagery' | 'arcgisGray';
type ArcgisRest = 'restTerrain' | 'restSatellite';
type StadiaRest = 'stadiaRest';

const DEFAULT_BASE_MAP: StadiaBaseMap = 'stadiaSmooth';
export type BaseLayerType =
  | StadiaBaseMap
  | ArcgisRest
  | StadiaRest
  | ArcgisBaseMap;

const stadiaMaps = 'https://tiles.stadiamaps.com/styles/';
const arcgis =
  'https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/';

function rasterSource(sourceName: string, url: string): MapOptions['style'] {
  return {
    version: 8,
    sources: {
      [sourceName]: {
        type: 'raster',
        tiles: [url],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: sourceName + '-layer',
        type: 'raster',
        source: sourceName,
      },
    ],
  };
}

export const baseLayerStyles: Record<BaseLayerType, MapOptions['style']> = {
  stadiaSmooth:
    stadiaMaps + 'alidade_smooth.json?api_key=' + environment.stadiamaps_key,
  stamenTerrain:
    stadiaMaps + 'stamen_terrain.json?api_key=' + environment.stadiamaps_key,
  stadiaSatellite:
    stadiaMaps + 'alidade_satellite.json?api_key=' + environment.stadiamaps_key,

  arcgisTopographic: arcgis + 'topographic?token=' + environment.arcgis_key,
  arcgisImagery: arcgis + 'imagery?token=' + environment.arcgis_key,
  arcgisGray: arcgis + 'light-gray?token=' + environment.arcgis_key,

  restTerrain: rasterSource(
    'worldTerrain',
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'
  ),
  restSatellite: rasterSource(
    'restSatellite',
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  ),
  stadiaRest: rasterSource(
    'stadia',
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png'
  ),
};

@Injectable()
export class MapConfigState {
  private _baseLayer$ = new BehaviorSubject<BaseLayerType>(DEFAULT_BASE_MAP);
  baseLayer$ = this._baseLayer$.asObservable();
  baseLayerUrl$ = this.baseLayer$.pipe(map((b) => baseLayerStyles[b]));

  updateBaseLayer(layer: BaseLayerType) {
    this._baseLayer$.next(layer);
  }
}

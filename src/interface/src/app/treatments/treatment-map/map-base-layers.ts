import { MapOptions } from 'maplibre-gl';
import { environment } from '../../../environments/environment';

type StadiaBaseMap = 'road';
type ArcgisRest = 'terrain' | 'satellite';

export const DEFAULT_BASE_MAP: StadiaBaseMap = 'road';
export type BaseLayerType = StadiaBaseMap | ArcgisRest;

export const baseLayerStyles: Record<BaseLayerType, MapOptions['style']> = {
  road:
    'https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=' +
    environment.stadiamaps_key,

  terrain: rasterSource(
    'worldTerrain',
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'
  ),
  satellite: rasterSource(
    'restSatellite',
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  ),
};

function rasterSource(sourceName: string, url: string): MapOptions['style'] {
  return {
    version: 8,
    metadata: {
      'mapbox:autocomposite': true,
    },
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

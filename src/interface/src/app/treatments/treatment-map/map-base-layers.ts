import { MapOptions } from 'maplibre-gl';

type StadiaBaseMap = 'road';
type ArcgisRest = 'terrain' | 'satellite';

export const DEFAULT_BASE_MAP: StadiaBaseMap = 'road';
export type BaseLayerType = StadiaBaseMap | ArcgisRest;

export const baseLayerStyles: Record<BaseLayerType, MapOptions['style']> = {
  road: 'mapbox://styles/mapbox/light-v10',
  terrain: 'mapbox://styles/mapbox/outdoors-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
};

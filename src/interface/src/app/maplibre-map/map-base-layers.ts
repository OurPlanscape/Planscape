import { MapOptions } from 'maplibre-gl';
import { BaseLayerType } from '../types/maplibre.map.types';

export const baseLayerStyles: Record<BaseLayerType, MapOptions['style']> = {
  road: 'mapbox://styles/mapbox/light-v10',
  terrain: 'mapbox://styles/mapbox/outdoors-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
};

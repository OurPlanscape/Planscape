import { MapOptions } from 'maplibre-gl';
import { BaseMapType } from '@types';

export const baseMapStyles: Record<BaseMapType, MapOptions['style']> = {
  road: 'mapbox://styles/mapbox/light-v10',
  terrain: 'mapbox://styles/mapbox/outdoors-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
};

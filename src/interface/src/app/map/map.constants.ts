import { Extent } from '../types';

export const FrontendConstants = {
  MAPLIBRE_MAP_INITIAL_ZOOM: 9,
  MAPLIBRE_MAP_MIN_ZOOM: 4,
  MAPLIBRE_MAP_MAX_ZOOM: 17,
  MAPLIBRE_MAP_DATA_LAYER_OPACITY: 0.75,
  MAPLIBRE_MAP_DATA_LAYER_TILESIZE: 512,
  MAPLIBRE_DEFAULT_BOUNDS: [
    -124.409591, // minLng (west)
    32.534156, // minLat (south)
    -114.131211, // maxLng (east)
    42.009518, // maxLat (north)
  ] as Extent,
  MAPLIBRE_BOUND_OPTIONS: {
    padding: { top: 80, bottom: 60, left: 20, right: 20 },
  },
} as const;

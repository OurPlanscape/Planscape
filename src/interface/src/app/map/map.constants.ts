import { Extent } from '@types';

export const MAP_WEST_CONUS_BOUNDS: Extent = [
  -126.0, // West Lng
  31.0, // Southern Lat
  -100.0, // East Lng
  47.0, // Northern Lat
];

export const FrontendConstants = {
  MAPLIBRE_MAP_INITIAL_ZOOM: 9,
  MAPLIBRE_MAP_MIN_ZOOM: 4,
  MAPLIBRE_MAP_MAX_ZOOM: 17,
  MAPLIBRE_MAP_VECTOR_LAYER_OPACITY: 0.5,
  MAPLIBRE_MAP_DATA_LAYER_OPACITY: 0.75,
  MAPLIBRE_MAP_DATA_LAYER_TILESIZE: 512,
  MAPLIBRE_DEFAULT_BOUNDS: MAP_WEST_CONUS_BOUNDS as Extent,

  MAPLIBRE_BOUND_OPTIONS: {
    padding: { top: 80, bottom: 60, left: 20, right: 20 },
  },
} as const;

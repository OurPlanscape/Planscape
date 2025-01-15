import { MapGeoJSONFeature } from 'maplibre-gl';

export function standIsForested(stand: MapGeoJSONFeature | null) {
  return stand && stand.properties['delta_0'] != null;
}

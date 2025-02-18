import { MapGeoJSONFeature } from 'maplibre-gl';

export type DisplayType = 'FORESTED' | 'NON_FORESTED' | 'NON_BURNABLE';

export function standIsForested(stand: MapGeoJSONFeature | null) {
  return (
    stand && (stand.properties['display_type'] as DisplayType) === 'FORESTED'
  );
}

export function standIsNonBurnable(stand: MapGeoJSONFeature | null) {
  return (
    stand &&
    (stand.properties['display_type'] as DisplayType) === 'NON_BURNABLE'
  );
}

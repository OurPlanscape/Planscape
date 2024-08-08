import {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';
import * as L from 'leaflet';
import booleanWithin from '@turf/boolean-within';
import booleanIntersects from '@turf/boolean-intersects';
import {
  BaseLayerType,
  Map,
  MapConfig,
  MapViewOptions,
  NONE_BOUNDARY_CONFIG,
  NONE_DATA_LAYER_CONFIG,
  Region,
} from '@types';

export function checkIfAreaInBoundaries(
  area: FeatureCollection,
  boundaries: Feature
): boolean {
  let overlappingAreas = area.features.map((feature) => {
    // if we want to allow multipolygons we need to transform them to polygons
    // to validate if in area.
    // if (feature.geometry.type === 'MultiPolygon') {
    //   return checkIfMultipolygonOverlaps(
    //     feature as Feature<MultiPolygon>,
    //     boundaries
    //   );
    // }
    return !booleanWithin(feature, boundaries);
  });
  return !overlappingAreas.some((overlap) => overlap);
}

// @ts-ignore
function checkIfMultipolygonOverlaps(
  feature: Feature<MultiPolygon>,
  boundaries: Feature
) {
  const overlap = feature.geometry.coordinates.some((coord) => {
    const newFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: coord,
      },
      properties: {},
    };
    return !booleanWithin(newFeature, boundaries);
  });
  return overlap;
}

export function areaOverlaps(
  editedLayer: L.Polygon,
  existingPolygon: L.Polygon
) {
  const isOverlapping = booleanWithin(
    editedLayer.toGeoJSON(),
    existingPolygon.toGeoJSON()
  );
  const isIntersecting = booleanIntersects(
    editedLayer.toGeoJSON(),
    existingPolygon.toGeoJSON()
  );
  return isOverlapping || isIntersecting;
}

export function addGeoJSONToMap(lGeoJson: L.GeoJSON, mapInstance: L.Map) {
  lGeoJson.addTo(mapInstance);
  mapInstance.fitBounds(lGeoJson.getBounds());
  mapInstance.invalidateSize();
}

export function getMapNameplateWidth(map: Map): number | null {
  const mapElement = document.getElementById(map.id);
  const attribution = mapElement
    ?.getElementsByClassName('leaflet-control-attribution')
    ?.item(0);
  const mapWidth = !!mapElement ? mapElement.clientWidth : null;
  const attributionWidth = !!attribution ? attribution.clientWidth : null;
  // The maximum width of the nameplate is equal to the width of the map minus the width
  // of Leaflet's attribution control. Additional padding/margins may be applied in the
  // nameplate component, but are not considered for this width.
  const nameplateWidth =
    !!mapWidth && !!attributionWidth ? mapWidth - attributionWidth : null;
  return nameplateWidth;
}

// TODO this should ideally return just geometry and not a feature collection
export function createMultiPolygonFeatureCollection(
  featureCollection: FeatureCollection
) {
  const newFeature: GeoJSON.Feature = {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [],
    },
    properties: {},
  };
  featureCollection.features.forEach((feature) => {
    (newFeature.geometry as MultiPolygon).coordinates.push(
      (feature.geometry as Polygon).coordinates
    );
  });

  return newFeature.geometry;
}

export function regionMapCenters(region: Region): L.LatLngTuple {
  // TODO Confirm center coordinates for new regions (northern, central, southern)
  switch (region) {
    case Region.SIERRA_NEVADA:
      return [38.646, -120.548];
    case Region.NORTHERN_CALIFORNIA:
      return [39.703, -123.313];
    case Region.CENTRAL_COAST:
      return [36.598, -121.896];
    case Region.SOUTHERN_CALIFORNIA:
      return [34.0522, -118.243];
    default:
      // Defaults to Sierra Nevada center
      return [38.646, -120.548];
  }
}

export function defaultMapConfig(): MapConfig {
  return {
    baseLayerType: BaseLayerType.Road,
    boundaryLayerConfig: NONE_BOUNDARY_CONFIG,
    dataLayerConfig: NONE_DATA_LAYER_CONFIG,
    showExistingProjectsLayer: false,
  };
}

export function defaultMapViewOptions(): MapViewOptions {
  return {
    selectedMapIndex: 0,
    numVisibleMaps: 4,
    zoom: 9,
    center: [38.646, -120.548],
  };
}

export function defaultMapConfigsDictionary(): Record<Region, MapConfig[]> {
  return {
    [Region.SIERRA_NEVADA]: [
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
    ],
    [Region.SOUTHERN_CALIFORNIA]: [
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
    ],
    [Region.NORTHERN_CALIFORNIA]: [
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
    ],
    [Region.CENTRAL_COAST]: [
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
      defaultMapConfig(),
    ],
  };
}

export function transformCoordToLayer(coord: Position[][]) {
  const newFeature: GeoJSON.Feature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: coord,
    },
    properties: {},
  };

  return new L.GeoJSON(newFeature);
}

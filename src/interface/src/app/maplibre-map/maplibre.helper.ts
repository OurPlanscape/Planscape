import {
  LngLatBounds,
  Map as MapLibreMap,
  Point,
  ResourceType,
} from 'maplibre-gl';
import {
  isMapboxURL,
  transformMapboxUrl,
} from 'maplibregl-mapbox-request-transformer';
import { environment } from '@env/environment';
import { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import bbox from '@turf/bbox';
import { Extent } from '@types';
import { BASE_LAYERS_DEFAULT } from '@shared';
import area from '@turf/area';
import { Decimal } from 'decimal.js';

export function getBoundingBox(
  startPoint: Point,
  endPoint: Point
): [[number, number], [number, number]] {
  const start = [startPoint.x, startPoint.y];
  const end = [endPoint.x, endPoint.y];
  return [
    [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
    [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
  ];
}

export function addAuthHeaders(
  url: string,
  resourceType: ResourceType | undefined,
  cookie: string
) {
  if (resourceType === 'Tile' && url.includes('planscape.org')) {
    return {
      url: url, // Keep the URL unchanged
      headers: {
        Authorization: cookie ? 'Bearer ' + cookie : '',
      },
    };
  }
  return { url }; // Return unchanged if not applying headers
}

export function addRequestHeaders(
  url: string,
  resourceType: ResourceType | undefined,
  cookie: string
) {
  if (isMapboxURL(url) && resourceType) {
    return transformMapboxUrl(url, resourceType, environment.mapbox_key);
  }
  return addAuthHeaders(url, resourceType, cookie);
}

/**
 *
 * Return the bounds related to a particular geometry
 */
export function getBoundsFromGeometry(geometry: Geometry) {
  const geoFeature: Feature = { type: 'Feature', geometry, properties: {} };
  return bbox(geoFeature) as Extent;
}

export function getExtentFromLngLatBounds(bounds: LngLatBounds): Extent {
  return [
    bounds.getWest(), // west  (min longitude)
    bounds.getSouth(), // south (min latitude)
    bounds.getEast(), // east  (max longitude)
    bounds.getNorth(), // north (max latitude)
  ];
}

export type Cleanup = () => void;

function getCamera(map: MapLibreMap) {
  return {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export function syncMaps(...maps: MapLibreMap[]): Cleanup {
  // 0) initial sync on load
  const leaderCam = getCamera(maps[0]);
  maps.slice(1).forEach((m) => {
    if (m.loaded()) {
      m.jumpTo(leaderCam);
    } else {
      m.once('load', () => m.jumpTo(leaderCam));
    }
  });

  // 1) continuous sync
  const onMove = (e: any) => {
    if (!e.originalEvent) return;
    const cam = getCamera(e.target as MapLibreMap);
    maps.forEach((m) => {
      if (m !== e.target) m.jumpTo(cam);
    });
  };

  // 2) broadcast start/end
  const onStart = (e: any) => {
    if (!e.originalEvent) return;
    maps.forEach((m) => {
      if (m !== e.target) m.fire('movestart', { broadcast: true });
    });
  };
  const onEnd = (e: any) => {
    if (!e.originalEvent) return;
    maps.forEach((m) => {
      if (m !== e.target) m.fire('moveend', { broadcast: true });
    });
  };

  // 3) wire up
  maps.forEach((m) => {
    m.on('move', onMove);
    m.on('movestart', onStart);
    m.on('moveend', onEnd);
  });

  // 4) cleanup fn
  return () => {
    maps.forEach((m) => {
      m.off('move', onMove);
      m.off('movestart', onStart);
      m.off('moveend', onEnd);
    });
  };
}

function calcOpacity(opacity: string | undefined): number {
  const num = Number(opacity);
  return isNaN(num) ? BASE_LAYERS_DEFAULT.OPACITY : num;
}

export function defaultBaseLayerFill(fillColor?: string, fillOpacity?: string) {
  return {
    'fill-color': fillColor || BASE_LAYERS_DEFAULT.COLOR,

    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.5,
      calcOpacity(fillOpacity),
    ],
  } as any;
}

export function defaultBaseLayerLine(lineColor?: string) {
  return {
    'line-color': lineColor || BASE_LAYERS_DEFAULT.COLOR,
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      3,
      1,
    ],
  } as any;
}

export function acresForFeature(
  feature: Feature<Polygon | MultiPolygon>
): number {
  const conversionAcresToSqMeters = Decimal('4046.8564213562374');
  const areaInSquareMeters = Decimal(area(feature));
  const areaInAcres = areaInSquareMeters.div(conversionAcresToSqMeters);
  return areaInAcres.toNumber();
}

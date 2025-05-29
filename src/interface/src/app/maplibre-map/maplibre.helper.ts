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
import { environment } from '../../environments/environment';
import { Feature, Geometry } from 'geojson';
import bbox from '@turf/bbox';
import { Extent } from '@types';
import { BASE_LAYERS_DEFAULT } from '@shared';

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
        Authorization: 'Bearer ' + cookie,
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

/**
 * This snippet is taken from:
 * https://github.com/mapbox/mapbox-gl-sync-move/issues/14
 *
 *
 * Sync movements of two maps.
 *
 * All interactions that result in movement end up firing
 * a "move" event. The trick here, though, is to
 * ensure that movements don't cycle from one map
 * to the other and back again, because such a cycle
 * - could cause an infinite loop
 * - prematurely halts prolonged movements like
 *   double-click zooming, box-zooming, and flying
 */
export function syncMaps(...maps: MapLibreMap[]): Cleanup {
  // 1) continuous, frame-by-frame mirroring
  const onMove = (e: any) => {
    if (!e.originalEvent) return; // only user drags/zooms
    const cam = getCamera(e.target as MapLibreMap);
    maps.forEach((m) => {
      if (m !== e.target) m.jumpTo(cam);
    });
  };

  // 2) broadcast start/end once per gesture
  const onUserStart = (e: any) => {
    if (!e.originalEvent) return; // only the *real* user start
    maps.forEach((m) => {
      if (m !== e.target) {
        // fire a synthetic movestart on each *other* map
        m.fire('movestart', { broadcast: true });
      }
    });
  };
  const onUserEnd = (e: any) => {
    if (!e.originalEvent) return; // only the *real* user end
    maps.forEach((m) => {
      if (m !== e.target) {
        m.fire('moveend', { broadcast: true });
      }
    });
  };

  // 3) hook them all up
  maps.forEach((m) => {
    m.on('move', onMove);
    m.on('movestart', onUserStart);
    m.on('moveend', onUserEnd);
  });

  // 4) cleanup
  return () => {
    maps.forEach((m) => {
      m.off('move', onMove);
      m.off('movestart', onUserStart);
      m.off('moveend', onUserEnd);
    });
  };
}

export function defaultBaseLayerFill(fillColor?: string) {
  return {
    'fill-color': fillColor || BASE_LAYERS_DEFAULT.COLOR,

    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.5,
      0,
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

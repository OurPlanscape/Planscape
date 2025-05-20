import { Map as MapLibreMap, Point, ResourceType } from 'maplibre-gl';
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

export type Cleanup = () => void;

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
  // Create all the movement functions, because if they're created every time
  // they wouldn't be the same and couldn't be removed.
  let fns: Parameters<MapLibreMap['on']>[1][] = [];
  maps.forEach((map, index) => {
    // When one map moves, we turn off the movement listeners
    // on all the maps, move it, then turn the listeners on again
    fns[index] = () => {
      off();

      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      const pitch = map.getPitch();

      const clones = maps.filter((o, i) => i !== index);
      clones.forEach((clone) => {
        clone.jumpTo({
          center: center,
          zoom: zoom,
          bearing: bearing,
          pitch: pitch,
        });
      });

      on();
    };
  });

  const on = () => {
    maps.forEach((map, index) => {
      map.on('move', fns[index]);
    });
  };

  const off = () => {
    maps.forEach((map, index) => {
      map.off('move', fns[index]);
    });
  };

  on();

  return () => {
    off();
    fns = [];
    maps = [];
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

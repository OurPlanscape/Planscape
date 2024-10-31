import { Map as MapLibreMap, Point } from 'maplibre-gl';

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
export function syncMaps(...maps: MapLibreMap[]) {
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

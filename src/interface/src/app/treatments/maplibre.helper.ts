import { Point } from 'maplibre-gl';

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

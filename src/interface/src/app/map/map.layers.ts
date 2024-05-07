import { Map } from '@types';
import * as L from 'leaflet';
import { DRAWING_STYLES } from './map.constants';

export function addClonedLayerToMap(map: Map, layer: L.Layer) {
  const originalId = L.Util.stamp(layer);

  // Hacky way to clone, but it removes the reference to the origin layer
  const clonedLayer = L.geoJson((layer as L.Polygon).toGeoJSON()).setStyle({
    color: '#ffde9e',
    fillColor: '#ffde9e',
    weight: 5,
  });
  map.clonedDrawingRef?.addLayer(clonedLayer);
  map.drawnPolygonLookup![originalId] = clonedLayer;
}

export function removeClonedLayer(
  map: Map,
  layer: L.Layer,
  deleteOriginal: boolean
) {
  const originalPolygonKey = L.Util.stamp(layer);
  const clonedPolygon = map.drawnPolygonLookup![originalPolygonKey];
  map.clonedDrawingRef!.removeLayer(clonedPolygon);
  if (deleteOriginal) {
    delete map.drawnPolygonLookup![originalPolygonKey];
  }
}

export function addRegionLayer(map: Map, boundary: any) {
  if (map.regionLayerRef) {
    map.regionLayerRef?.remove();
  }
  map.regionLayerRef = createRegionLayer(boundary);
}

export function showRegionLayer(map: Map) {
  if (map.regionLayerRef) {
    map.regionLayerRef.addTo(map.instance!);
  }
}

export function hideRegionLayer(map: Map) {
  if (map.regionLayerRef) {
    map.regionLayerRef.removeFrom(map.instance!);
  }
}

function createRegionLayer(boundaries: GeoJSON.GeoJSON) {
  return L.geoJSON(boundaries, {
    style: (_) => ({
      color: '#93b3ff',
      weight: 4,
      opacity: 1,
      fillColor: '#000000',
      fillOpacity: 0,
    }),
  });
}

export function createDrawingLayer(
  planningAreaData: GeoJSON.GeoJSON,
  color?: string,
  opacity?: number
) {
  return L.geoJSON(planningAreaData, {
    pane: 'overlayPane',
    style: DRAWING_STYLES,
  });
}

import { Injectable } from '@angular/core';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';

@Injectable({
  providedIn: 'root',
})
export class RasterLayerService {
  private mapLibreMap!: MapLibreMap;

  setMap(map: MapLibreMap) {
    this.mapLibreMap = map;
  }

  addRasterLayer(cogUrl: string, tileSize: number, opacity: number): void {
    if (this.mapLibreMap && cogUrl) {
      const rasterSource: RasterSourceSpecification = {
        type: 'raster',
        url: cogUrl,
        tileSize: tileSize,
      };

      const rasterLayer: RasterLayerSpecification = {
        id: 'image-layer',
        type: 'raster',
        source: 'rasterImage',
        paint: {
          'raster-opacity': opacity,
          'raster-resampling': 'nearest',
        },
      };

      if (this.mapLibreMap.getLayer('image-layer')) {
        this.mapLibreMap.removeLayer('image-layer');
      }
      if (this.mapLibreMap.getSource('rasterImage')) {
        this.mapLibreMap.removeSource('rasterImage');
      }
      this.mapLibreMap.addSource('rasterImage', rasterSource);
      this.mapLibreMap.addLayer(rasterLayer, 'bottom-layer');
    }
  }

  removeRasterLayer(): void {
    if (this.mapLibreMap) {
      if (this.mapLibreMap.getLayer('image-layer')) {
        this.mapLibreMap.removeLayer('image-layer');
      }
      if (this.mapLibreMap.getSource('rasterImage')) {
        this.mapLibreMap.removeSource('rasterImage');
      }
    }
  }
}

import { Component, Input, OnInit } from '@angular/core';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { DataLayer } from '@types';
import { makeColorFunction } from '../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapDataLayerComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  opacity = 0.75;
  tileSize = 512;
  cogUrl: string | null = null;

  constructor(dataLayersStateService: DataLayersStateService) {
    dataLayersStateService.selectedDataLayer$
      .pipe(untilDestroyed(this))
      .subscribe((dataLayer: DataLayer | null) => {
        if (dataLayer?.public_url) {
          this.cogUrl = `cog://${dataLayer?.public_url}`;
          const colorFn = makeColorFunction(dataLayer?.styles as any);
          setColorFunction(dataLayer?.public_url ?? '', colorFn);
          this.tileSize = dataLayer.info.blockxsize ?? 512;
          this.addRasterLayer();
        } else {
          this.cogUrl = null;
          this.removeRasterLayer();
        }
      });
  }

  ngOnInit(): void {
    this.listenForBaseLayerChange();
  }


  listenForBaseLayerChange() {
    this.mapLibreMap.on('styledata', () => {
      // if the style change caused the other layers to be removed, then we need to re-add them.
      if (!this.mapLibreMap.getSource('rasterImage')) {
        this.addRasterLayer();
      }
    });
  }


  addRasterLayer(): void {
    if (this.mapLibreMap && this.cogUrl) {
      const rasterSource: RasterSourceSpecification = {
        type: 'raster',
        url: this.cogUrl,
        tileSize: this.tileSize,
      };

      const rasterLayer: RasterLayerSpecification = {
        id: 'image-layer',
        type: 'raster',
        source: 'rasterImage',
        paint: {
          'raster-opacity': this.opacity,
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

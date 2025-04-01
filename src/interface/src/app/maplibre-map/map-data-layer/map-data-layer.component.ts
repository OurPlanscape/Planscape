import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { makeColorFunction } from '../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  LayerComponent,
  RasterSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DataLayer } from '@types';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import {
  Map as MapLibreMap,
  RasterSourceSpecification,
  RasterLayerSpecification,
} from 'maplibre-gl';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [NgIf, LayerComponent, RasterSourceComponent],
  template: '',
  styleUrl: './map-data-layer.component.scss',
})
export class MapDataLayerComponent {
  @Input() mapLibreMap!: MapLibreMap;
  OPACITY = 0.75;
  tileSize = 512;
  cogUrl = '';
  dataLayer: DataLayer | null = null;
  before: string = 'bottom-layer';

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
          'raster-opacity': this.OPACITY,
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
      this.mapLibreMap.addLayer(rasterLayer, this.before);
    }
  }

  removeRasterLayer(): void {
    if (this.mapLibreMap) {
      //this.mapLibreMap.once('idle', () => {
      if (this.mapLibreMap.getLayer('image-layer')) {
        this.mapLibreMap.removeLayer('image-layer');
      }
      if (this.mapLibreMap.getSource('rasterImage')) {
        this.mapLibreMap.removeSource('rasterImage');
      }
      //  }
    }
  }

  ngOnDestroy(): void {
    this.removeRasterLayer();
  }

  constructor(dataLayersStateService: DataLayersStateService) {
    dataLayersStateService.selectedDataLayer$
      .pipe(untilDestroyed(this))
      .subscribe((dataLayer: DataLayer | null) => {
        if (dataLayer?.public_url) {
          this.cogUrl = `cog://${dataLayer?.public_url}`;
          this.tileSize = dataLayer.info.blockxsize ?? 512;
          const colorFn = makeColorFunction(dataLayer?.styles as any);
          setColorFunction(dataLayer?.public_url ?? '', colorFn);
          this.addRasterLayer();
        } else {
          this.removeRasterLayer();
        }
      });
  }
}

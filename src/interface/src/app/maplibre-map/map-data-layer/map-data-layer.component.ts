import { Component, Input, OnInit } from '@angular/core';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import {
  justPurpleColorFunction,
  generateColorFunction,
} from '../../data-layers/utilities';
import { DataLayer, FrontendConstants } from '@types';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapDataLayerComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  opacity: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY;
  tileSize: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
  cogUrl: string | null = null;

  //profiling
  startTime = 0;
  endTime = 0;
  usePurpleFunction = true;

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private matSnackBar: MatSnackBar
  ) {
    dataLayersStateService.selectedDataLayer$
      .pipe(untilDestroyed(this))
      .subscribe((dataLayer: DataLayer | null) => {
        if (dataLayer?.public_url) {
          this.startTime = 0;
          this.endTime = 0;
          this.startTime = performance.now();
          this.cogUrl = `cog://${dataLayer?.public_url}&time=startTime`;
          if (this.usePurpleFunction) {
            const purpleFn = justPurpleColorFunction(dataLayer?.styles[0].data);
            console.log(
              'Just PURPLE color function. Loading layer: ',
              dataLayer.name
            );
            setColorFunction(dataLayer?.public_url ?? '', purpleFn);
          } else {
            const colorFn = generateColorFunction(dataLayer?.styles[0].data);
            console.log(
              'Regular color function. Loading layer: ',
              dataLayer.name
            );
            setColorFunction(dataLayer?.public_url ?? '', colorFn);
          }
          this.tileSize =
            dataLayer.info.blockxsize ??
            FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
          this.addRasterLayer();
        } else {
          this.cogUrl = null;
          this.removeRasterLayer();
        }
      });
  }

  ngOnInit(): void {
    this.addListeners();
  }

  addListeners() {
    this.mapLibreMap.on('styledata', () => {
      // if the style change caused the other layers to be removed, then we need to re-add them.
      if (!this.mapLibreMap.getSource('rasterImage')) {
        this.addRasterLayer();
      }
    });

    this.mapLibreMap.on('data', (event: any) => {
      if (
        this.mapLibreMap.getSource('rasterImage') &&
        event.sourceId === 'rasterImage' &&
        event.isSourceLoaded
      ) {
        this.dataLayersStateService.setDataLayerLoading(false);
        this.endTime = performance.now();
        console.log(
          'loading time was:',
          (this.endTime - this.startTime) / 1000,
          ' seconds.'
        );
        this.endTime = 0;
        this.startTime = 0;
      }
    });

    this.mapLibreMap.on('error', (event: any) => {
      if (
        this.mapLibreMap.getSource('rasterImage') &&
        event.sourceId === 'rasterImage' &&
        !event.isSourceLoaded
      ) {
        this.dataLayersStateService.setDataLayerLoading(false);
        this.matSnackBar.open(
          '[Error] Unable to load data layer.',
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      }
    });
  }

  addRasterLayer(): void {
    if (this.mapLibreMap && this.cogUrl) {
      const rasterSource: RasterSourceSpecification = {
        type: 'raster',
        url: this.cogUrl,
        tileSize: this.tileSize,
        minzoom: FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM,
        maxzoom: FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM,
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
      this.removeRasterLayer();
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

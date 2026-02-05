import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { generateColorFunction } from '@app/data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_DEBUG_CONFIG, SNACK_ERROR_CONFIG } from '@shared';
import { environment } from '@env/environment';
import * as Sentry from '@sentry/browser';
import { EventData } from '@maplibre/ngx-maplibre-gl';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { filter, firstValueFrom } from 'rxjs';
import { FrontendConstants } from '@app/map/map.constants';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapDataLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  tileSize: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
  cogUrl: string | null = null;

  errorCount = 0;

  constructor(
    private mapConfigState: MapConfigState,
    private dataLayersStateService: DataLayersStateService,
    private matSnackBar: MatSnackBar
  ) {
    dataLayersStateService.dataLayerWithUrl$
      .pipe(untilDestroyed(this))
      .subscribe((data) => {
        if (data) {
          this.cogUrl = `cog://${data.url}`;
          const colorFn = generateColorFunction(data.layer?.styles[0].data);
          setColorFunction(data.url, colorFn);
          this.tileSize =
            data.layer.info.blockxsize ??
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

    this.listenForOpacityChanges();
  }

  listenForOpacityChanges() {
    // Listen for opacity changes
    this.mapConfigState.dataLayersOpacity$
      .pipe(
        untilDestroyed(this),
        filter(() => !!this.mapLibreMap?.getLayer('image-layer')) // Checking if it's already added
      )
      .subscribe((newOpacity) => {
        // Updating raster opacity
        this.mapLibreMap.setPaintProperty(
          'image-layer',
          'raster-opacity',
          newOpacity
        );
      });
  }

  addListeners() {
    this.mapLibreMap.on('styledata', this.onStyleDataListener);
    this.mapLibreMap.on('data', this.onDataListener);
    this.mapLibreMap.on('error', this.onErrorListener);
  }

  async addRasterLayer() {
    if (this.mapLibreMap && this.cogUrl) {
      const currentOpacity: number = await firstValueFrom(
        this.mapConfigState.dataLayersOpacity$
      );
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
          'raster-opacity': currentOpacity,
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

  ngOnDestroy(): void {
    // remove listeners
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
    this.mapLibreMap.off('data', this.onDataListener);
    this.mapLibreMap.off('error', this.onErrorListener);
  }

  private onStyleDataListener = () => {
    // if the style change caused the other layers to be removed, then we need to re-add them.
    if (!this.mapLibreMap.getSource('rasterImage')) {
      this.addRasterLayer();
    }
  };

  private onDataListener = (event: any) => {
    if (
      this.mapLibreMap.getSource('rasterImage') &&
      event.sourceId === 'rasterImage' &&
      event.isSourceLoaded
    ) {
      this.errorCount = 0;
      this.dataLayersStateService.setDataLayerLoading(false);
    }
  };

  private onErrorListener = (event: ErrorEvent & EventData) => {
    if (
      this.mapLibreMap.getSource('rasterImage') &&
      event['sourceId'] === 'rasterImage' &&
      !event['isSourceLoaded']
    ) {
      if (this.errorCount < 2) {
        this.dataLayersStateService.reloadDataLayerUrl();
        this.errorCount++;
      } else {
        this.dataLayersStateService.setDataLayerLoading(false);

        if (environment.debug_layers) {
          this.debugErrors(event);
        } else {
          this.matSnackBar.open(
            '[Error] Unable to load data layer.',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        }

        //explictly log Sentry details
        const debugDetails =
          `Unable to load data layer:\n` +
          `${event.error.name}\n` +
          `${event.error.message}\n` +
          `${event.error.errors.join(',')}\n` +
          `${event['source'].url},\n${event.error.errors.join(',')}`;
        Sentry.captureException(debugDetails);
      }
    }
  };

  private debugErrors(event: any) {
    console.error('MapLibre Error:', event);
    console.error('Error:', event.error);
    console.error('Error type:', event.error.name);
    console.error('Error message:', event.error.message);
    console.error('Error details:', event.error.errors.join(','));
    console.error('Source url:', event.source.url);
    console.error('source details:', this.mapLibreMap.getSource('rasterImage'));

    const snackDebugMessage =
      `[Error] Unable to load data layer:\n` +
      `${event.error.name}\n` +
      `${event.error.message}\n` +
      `${event.error.errors.join(',')}\n` +
      `${event.source.url.split(/[&?]/).join('\n')},\n` +
      `${event.error.errors.join(',')}`;
    this.matSnackBar.open(snackDebugMessage, 'Dismiss', SNACK_DEBUG_CONFIG);
  }
}

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { generateColorFunction } from '@data-layers/utilities';
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
import { MapConfigState } from '../map-config.state';
import { filter, firstValueFrom } from 'rxjs';
import { FrontendConstants } from '@map/map.constants';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapDataLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  /**
   * Id of a data layer that should render *above* the funding treatment layer
   * instead of below the rest of the stack. When the currently viewed layer
   * matches this id, its raster is inserted just under the project-area
   * outlines rather than before `bottom-layer`. Only set on the funding map;
   * left null everywhere else, preserving the default below-everything order.
   */
  @Input() topDataLayerId: number | null = null;

  /** Opacity the designated top layer renders at, overriding the shared default. */
  private static readonly TOP_LAYER_OPACITY = 1;

  tileSize: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
  cogUrl: string | null = null;
  /** Id of the data layer currently rendered as `image-layer`. */
  private currentLayerId: number | null = null;

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
          this.currentLayerId = data.layer?.id ?? null;
          const colorFn = generateColorFunction(data.layer?.styles[0].data);
          setColorFunction(data.url, colorFn);
          this.tileSize =
            data.layer.info.blockxsize ??
            FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
          this.addRasterLayer();
        } else {
          this.cogUrl = null;
          this.currentLayerId = null;
          this.removeRasterLayer();
        }
      });
  }

  /** Whether the currently viewed layer is the designated top layer. */
  private isTopLayer(): boolean {
    return (
      this.topDataLayerId != null && this.currentLayerId === this.topDataLayerId
    );
  }

  /**
   * Where to insert the raster in the layer stack. Defaults to `bottom-layer`
   * (below the treatment layer). The designated `topDataLayerId` instead sits
   * above the treatment layer, just below the project-area outlines.
   */
  private beforeLayerId(): string | undefined {
    if (
      this.isTopLayer() &&
      this.mapLibreMap.getLayer('map-project-areas-line')
    ) {
      return 'map-project-areas-line';
    }
    return 'bottom-layer';
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
      // The top layer defaults to fully opaque rather than the shared
      // data-layers default; other layers honor the current opacity setting.
      const currentOpacity: number = this.isTopLayer()
        ? MapDataLayerComponent.TOP_LAYER_OPACITY
        : await firstValueFrom(this.mapConfigState.dataLayersOpacity$);
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
      this.mapLibreMap.addLayer(rasterLayer, this.beforeLayerId());
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

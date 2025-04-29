import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { generateColorFunction } from '../../data-layers/utilities';
import { FrontendConstants } from '@types';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_DEBUG_CONFIG, SNACK_ERROR_CONFIG } from '@shared';
import { environment } from 'src/environments/environment';
import * as Sentry from '@sentry/browser';
import { EventData } from '@maplibre/ngx-maplibre-gl';

@UntilDestroy()
@Component({
  selector: 'app-map-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class MapDataLayerComponent implements OnInit, OnDestroy {
  @Input() mapLibreMap!: MapLibreMap;
  opacity: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY;
  tileSize: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
  cogUrl: string | null = null;

  errorCount = 0;

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private matSnackBar: MatSnackBar
  ) {
    dataLayersStateService.dataLayerWithUrl$
      .pipe(untilDestroyed(this))
      .subscribe((data) => {

        const memoryDetails = this.inspectMapMemory();
        console.log('Memory details so far:', memoryDetails);
        const cogDetails = this.inspectCOGSources();
        console.log('cog memory details on data layer change:', cogDetails);
        if (data) {
          this.cogUrl = `cog://${data.url}`;
          const colorFn = generateColorFunction(data.layer?.styles[0].data);
          setColorFunction(data.url, colorFn);
          this.tileSize =
            data.layer.info.blockxsize ??
            FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
          this.addRasterLayer();
          const memoryDetails = this.inspectMapMemory();
          console.log('Memory details after add:', memoryDetails);
          const cogDetails = this.inspectCOGSources();
          console.log('cog memory details after layer add:', cogDetails);

        } else {
          this.cogUrl = null;
          this.removeRasterLayer();
        }
      });
  }

  // Specifically for monitoring COG sources
  private inspectCOGSources() {
    if (!this.mapLibreMap) {
      return {};
    }

    type cogTileDetails = {
      coord: any,
      textureSize: string,
      state: any,
      memoryEstimate: string
    }

    const map = this.mapLibreMap;
    let cogReport = {};

    const cogDetails: cogTileDetails[] = [];


    Object.keys(map.style.sourceCaches || {}).forEach(sourceId => {
      const source = map.getSource(sourceId);

      // Check if it's likely a COG source (based on common properties)
      if (source && source.type === 'raster') {
        const sourceCache = map.style.sourceCaches[sourceId];
        const tiles = sourceCache._tiles || {};

        cogReport = {
          id: source.tileID,
          tileCount: Object.keys(tiles).length,
          visibleTiles: sourceCache.getVisibleCoordinates?.() || [],
          tileSize: source.tileSize,
          tiles: {},
        };

        // Get details for each COG tile
        Object.keys(tiles).forEach(tileId => {
          const tile = tiles[tileId];
          if (tile && tile.texture) {
            cogDetails.push({
              coord: `${tile.tileID.canonical.z}/${tile.tileID.canonical.x}/${tile.tileID.canonical.y}`,
              textureSize: tile.texture.width ? `${tile.texture.width}x${tile.texture.height}` : 'unknown',
              state: tile.state,
              memoryEstimate: tile.texture.width ?
                (tile.texture.width * tile.texture.height * 4 / (1024 * 1024)).toFixed(2) + ' MB' :
                'unknown'
            });
          }
        });
      }
    });
    console.log('cogDetails:', cogDetails);

    console.log('cogReport:', cogReport);
    return cogReport;
  }

  ngOnInit(): void {
    this.addListeners();
  }

  addListeners() {
    this.mapLibreMap.on('styledata', this.onStyleDataListener);
    this.mapLibreMap.on('data', this.onDataListener);
    this.mapLibreMap.on('error', this.onErrorListener);
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

    const afterLoadMemory = this.inspectMapMemory();
    console.log('Memory details after loaded:', afterLoadMemory);
    const cogLaterDetails = this.inspectCOGSources();
    console.log('cog memory details after raster image loaded:', cogLaterDetails);
  };


  // inspect memory usage
  private inspectMapMemory() {
    const map = this.mapLibreMap;
    if (!map) {
      return {};
    }

    type tileDetails = {
      type: string,
      tileCount: number,
      tiles: {},
    };

    const memoryReport = {
      knownSources: [],
      sources: {},
      layers: [],
      textureCount: 0,
      tileCount: 0,
      estimatedTextureMemory: 0,
      sourceCount: 0,
    };

    const knownSources: tileDetails[] = [];

    // Inspect sources
    const sourceIds = Object.keys(map.style.sourceCaches || {});
    memoryReport.sourceCount = sourceIds.length;

    sourceIds.forEach((sourceId: string) => {
      const sourceCache = map.style.sourceCaches[sourceId];
      if (sourceCache) {
        const tiles = sourceCache._tiles || {};
        const tileIds = Object.keys(tiles);

        const tileDetails = {
          type: map.getSource(sourceId)?.type ?? 'unknown',
          tileCount: tileIds.length,
          tiles: {}
        };

        knownSources.push(tileDetails);

        // Count total tiles
        memoryReport.tileCount += tileIds.length;


        // Inspect individual tiles
        tileIds.forEach(tileId => {
          const tile = tiles[tileId];
          if (tile && tile.texture) {
            memoryReport.textureCount++;

            // // Rough texture memory estimate (if dimensions are available)
            if (tile.texture.width && tile.texture.height) {
              // Assuming 4 bytes per pixel (RGBA)
              const textureMem = tile.texture.width * tile.texture.height * 4;
              memoryReport.estimatedTextureMemory += textureMem;

              console.log(
                `coord: ${tile.tileID.canonical.z}/${tile.tileID.canonical.x}/${tile.tileID.canonical.y}`,
                `size: ${tile.texture.width}x${tile.texture.height}`,
                'memoryBytes: ', textureMem
              );
            }
          }
        });

      }
    });
    console.log('knownSources:', knownSources);
    //Inspect WebGL context memory
    const gl = map.painter.context.gl;
    if (gl && gl.getParameter) {
      try {

        console.log('GL texture image units: ', gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
        // Try to fetch memory info if available (Chrome only)
        console.log('GL debug renger info: ',gl.getExtension('WEBGL_debug_renderer_info'));
        // if (performanceExt && gl.getParameter(performanceExt.GPU_MEMORY_INFO_CURRENT_AVAILABLE_MEMORY_NVX)) {
        //   memoryReport.availableGpuMemory = gl.getParameter(performanceExt.GPU_MEMORY_INFO_CURRENT_AVAILABLE_MEMORY_NVX);
        // }
      } catch (e : any) {
        console.log('error fetching GL memory:', e.message);
      }
    }


    // // Format memory values for readability
    // memoryReport.estimatedTextureMemoryMB = (memoryReport.estimatedTextureMemory / (1024 * 1024)).toFixed(2) + ' MB';

    return memoryReport;
  }


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

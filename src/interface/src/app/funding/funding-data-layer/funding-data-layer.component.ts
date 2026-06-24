import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { generateColorFunction } from '@data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import {
  Map as MapLibreMap,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl';
import { filter, firstValueFrom } from 'rxjs';
import { FrontendConstants } from '@map/map.constants';
import { DataLayer } from '@app/types';
import { FundingMapConfigState } from '../funding-map-config-state';

const SOURCE_ID = 'funding-raster-image';
const LAYER_ID = 'funding-image-layer';

/**
 * Renders a single data layer for the funding report. Unlike
 * `MapDataLayerComponent`, this component is not hooked up to
 * `DataLayersStateService`: it simply shows the layer passed via the
 * `dataLayer` input, always visible.
 */
@UntilDestroy()
@Component({
  selector: 'app-funding-data-layer',
  standalone: true,
  imports: [],
  template: '',
})
export class FundingDataLayerComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() mapLibreMap!: MapLibreMap;
  @Input() dataLayer!: DataLayer;

  tileSize: number = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
  cogUrl: string | null = null;

  constructor(private fundingMapConfigState: FundingMapConfigState) {}

  ngOnInit(): void {
    this.addListeners();
    this.listenForOpacityChanges();
    this.loadLayer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload when the layer changes after the first render.
    if (changes['dataLayer'] && !changes['dataLayer'].firstChange) {
      this.loadLayer();
    }
  }

  private loadLayer(): void {
    const url = this.dataLayer?.public_url;
    if (!url) {
      return;
    }
    this.cogUrl = `cog://${url}`;
    const colorFn = generateColorFunction(this.dataLayer.styles[0].data);
    setColorFunction(url, colorFn);
    this.tileSize =
      this.dataLayer.info.blockxsize ??
      FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_TILESIZE;
    this.addRasterLayer();
  }

  private listenForOpacityChanges(): void {
    this.fundingMapConfigState.opacity$
      .pipe(
        untilDestroyed(this),
        filter(() => !!this.mapLibreMap?.getLayer(LAYER_ID))
      )
      .subscribe((newOpacity) => {
        this.mapLibreMap.setPaintProperty(LAYER_ID, 'raster-opacity', newOpacity);
      });
  }

  private addListeners(): void {
    this.mapLibreMap.on('styledata', this.onStyleDataListener);
  }

  async addRasterLayer(): Promise<void> {
    if (this.mapLibreMap && this.cogUrl) {
      const currentOpacity: number = await firstValueFrom(
        this.fundingMapConfigState.opacity$
      );
      const rasterSource: RasterSourceSpecification = {
        type: 'raster',
        url: this.cogUrl,
        tileSize: this.tileSize,
        minzoom: FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM,
        maxzoom: FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM,
      };

      const rasterLayer: RasterLayerSpecification = {
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        paint: {
          'raster-opacity': currentOpacity,
          'raster-resampling': 'nearest',
        },
      };
      this.removeRasterLayer();
      this.mapLibreMap.addSource(SOURCE_ID, rasterSource);
      this.mapLibreMap.addLayer(rasterLayer, 'bottom-layer');
    }
  }

  removeRasterLayer(): void {
    if (this.mapLibreMap) {
      if (this.mapLibreMap.getLayer(LAYER_ID)) {
        this.mapLibreMap.removeLayer(LAYER_ID);
      }
      if (this.mapLibreMap.getSource(SOURCE_ID)) {
        this.mapLibreMap.removeSource(SOURCE_ID);
      }
    }
  }

  ngOnDestroy(): void {
    this.mapLibreMap.off('styledata', this.onStyleDataListener);
  }

  private onStyleDataListener = () => {
    // if the style change caused the layer to be removed, re-add it.
    if (this.cogUrl && !this.mapLibreMap.getSource(SOURCE_ID)) {
      this.addRasterLayer();
    }
  };
}

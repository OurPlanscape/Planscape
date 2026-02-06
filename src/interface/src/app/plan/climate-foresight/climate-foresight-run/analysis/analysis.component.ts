import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  isMapboxURL,
  transformMapboxUrl,
} from 'maplibregl-mapbox-request-transformer';

import {
  ButtonComponent,
  OpacitySliderComponent,
  SectionComponent,
} from '@styleguide';
import {
  ClimateForesightRun,
  DataLayer,
  GeoPackageDownloadStatus,
  StyleJson,
} from '@types';
import { generateColorFunction as generateColorFunctionFromStyle } from '@data-layers/utilities';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { PlanState } from '@plan/plan.state';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { PlanningAreaLayerComponent } from '@maplibre-map/planning-area-layer/planning-area-layer.component';
import {
  Map as MapLibreMap,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '@maplibre-map/maplibre.helper';
import { AuthService, ClimateForesightService } from '@services';
import { DataLayersService } from '@services/data-layers.service';
import { environment } from '@env/environment';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import { TypedArray } from '@geomatico/maplibre-cog-protocol/dist/types';
import { MapConfigService } from '@maplibre-map/map-config.service';
import {
  LegendEntry,
  MpatLegendComponent,
} from '@plan/climate-foresight/climate-foresight-run/analysis/mpat-legend/mpat-legend.component';
import {
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
} from '@shared/constants';
import { SharedModule } from '@shared/shared.module';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatMenuModule } from '@angular/material/menu';
import { PopoverComponent } from '@styleguide/popover/popover.component';

type ColorFunction = (pixel: TypedArray, rgba: Uint8ClampedArray) => void;

export interface OutputLayer {
  id: string;
  name: string;
  datalayerId: number | null;
  datalayer?: DataLayer | null;
  type: 'mpat' | 'continuous';
  group: string;
  scale?: [number, number]; // [min, max] for continuous layers, e.g. [0, 1] or [0, 100]
  tooltip?: string;
}

@UntilDestroy()
@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    ButtonComponent,
    OpacitySliderComponent,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MapComponent,
    PlanningAreaLayerComponent,
    MpatLegendComponent,
    SectionComponent,
    MatMenuModule,
    PopoverComponent,
  ],
  providers: [MapConfigService],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss'],
})
export class AnalysisComponent implements OnInit, OnDestroy {
  run: ClimateForesightRun | null = null;
  runId: number | null = null;
  planId: number | null = null;
  loading = true;
  downloading = false;
  downloadStatus: GeoPackageDownloadStatus | null = null;
  downloadUrl: string | null = null;
  private downloadPollingInterval: ReturnType<typeof setInterval> | null = null;

  mpatMatrixLayer: OutputLayer | null = null;
  adaptProtectLayer: OutputLayer | null = null;
  integratedConditionLayer: OutputLayer | null = null;

  selectedLayerId: string | null = null;
  selectedLayer: OutputLayer | null = null;
  opacity = 70;

  mapLibreMap: MapLibreMap | null = null;
  bounds$: Observable<[number, number, number, number] | null>;
  baseLayerUrl$;
  maxZoom = 22;
  minZoom = 4;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router,
    private mapConfigState: MapConfigState,
    private planState: PlanState,
    private authService: AuthService,
    private climateForesightService: ClimateForesightService,
    private dataLayersService: DataLayersService,
    private mapConfigService: MapConfigService,
    private snackBar: MatSnackBar
  ) {
    this.mapConfigService.initialize();

    this.bounds$ = this.planState.planningAreaGeometry$.pipe(
      map((geometry) => {
        if (!geometry) {
          return null;
        }
        const bounds = getBoundsFromGeometry(geometry);
        if (bounds?.every((coord) => isFinite(coord))) {
          return bounds as [number, number, number, number];
        }
        return null;
      }),
      filter(
        (bounds): bounds is [number, number, number, number] => bounds !== null
      )
    );

    this.baseLayerUrl$ = this.mapConfigState.baseMapUrl$.pipe(
      map((url) => {
        if (isMapboxURL(url as string)) {
          return transformMapboxUrl(
            url as string,
            'Style' as ResourceType,
            environment.mapbox_key
          ).url;
        }
        return url;
      })
    );
  }

  ngOnInit(): void {
    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.runId = +params['runId'];
      this.planId = +params['planId'];
      this.loadRun();
    });
  }

  ngOnDestroy(): void {
    this.stopDownloadPolling();
  }

  private stopDownloadPolling(): void {
    if (this.downloadPollingInterval) {
      clearInterval(this.downloadPollingInterval);
      this.downloadPollingInterval = null;
    }
  }

  private loadRun(): void {
    if (!this.runId) return;

    this.loading = true;
    this.climateForesightService
      .getRun(this.runId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (run) => {
          this.run = run;
          this.buildOutputLayers();

          this.breadcrumbService.breadcrumb$
            .pipe(take(1))
            .subscribe((breadcrumb) => {
              if (breadcrumb?.label !== `Climate Foresight: ${run.name}`) {
                this.breadcrumbService.updateBreadCrumb({
                  label: `Climate Foresight: ${run.name}`,
                  backUrl: `/plan/${this.planId}/climate-foresight`,
                  icon: 'arrow_back',
                });
              }
            });
          this.loading = false;

          if (this.mpatMatrixLayer) {
            this.selectLayer(this.mpatMatrixLayer);
          }
        },
        error: (err) => {
          console.error('Failed to load run:', err);
          this.loading = false;
          this.snackBar.open(
            'Failed to load analysis',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
  }

  private buildOutputLayers(): void {
    if (!this.run) return;

    if (this.run.promote) {
      const promote = this.run.promote;

      this.mpatMatrixLayer = {
        id: 'mpat_matrix',
        name: 'MPAT Matrix',
        datalayerId: promote.mpat_strength_datalayer_id,
        datalayer: promote.mpat_strength_datalayer,
        type: 'mpat',
        group: 'primary',
        tooltip:
          '<p>A categorical assessment that assigns each raster cell to one of four climatic response strategies—Monitor, Protect, Adapt, or Transform (MPAT)—based on the combination of <ul><li>1) the favorability of  current condition and </li><li>2) associated pillar’s vulnerability to future climate conditions.</li></ul>Strategies are further defined as strong or weak depending on the quantitative support for a given climate response strategy.</p><p>This process provides a climate-informed methodology to help prioritize areas for different levels of intervention, from passive (Strong Monitors) to transformative (Strong Transforms) management, ensuring landscapes are managed sustainably in response to future climate conditions.</p>',
      };

      this.adaptProtectLayer = {
        id: 'adapt_protect',
        name: 'Adapt-Protect Score',
        datalayerId: promote.adapt_protect_datalayer_id,
        datalayer: promote.adapt_protect_datalayer,
        type: 'continuous',
        group: 'primary',
        scale: [0, 100],
        tooltip:
          '<p>A scaled metric (0-100) that represents a level of support for active management. Higher values indicate support for either <ul><li>1) protecting resources currently in favorable condition but vulnerable to future climate or </li><li>2) adapting areas that are currently in unfavorable condition but where climate will not be an impediment to sustaining the resource.</li></ul> This interpretation helps land managers prioritize dual goals of protecting ecological resources vulnerable to future climate change, while improving conditions where climate will be less impactful.</p>',
      };

      this.integratedConditionLayer = {
        id: 'integrated_condition',
        name: 'Integrated Condition Score',
        datalayerId: promote.integrated_condition_score_datalayer_id,
        datalayer: promote.integrated_condition_score_datalayer,
        type: 'continuous',
        group: 'primary',
        scale: [0, 100],
        tooltip:
          '<p>A scaled metric (0-100) that reflects a continuum of climate resilience strategies from the MPAT classification. Areas categorized as Monitor are closest to 0, indicating favorable current and future conditions. Adapt and Protect  are intermediate with equivalent weighting, representing balanced management strategies. Transform is nearest to 100, highlighting areas where significant change is likely and intervention is warranted.</p>',
      };
    }
  }

  selectLayer(layer: OutputLayer): void {
    this.selectedLayerId = layer.id;
    this.selectedLayer = layer;
    this.loadLayerPreview(layer);
  }

  onLayerChange(layerId: string): void {
    const primaryLayers = [
      this.mpatMatrixLayer,
      this.adaptProtectLayer,
      this.integratedConditionLayer,
    ].filter((l): l is OutputLayer => l !== null);

    const allLayers = [...primaryLayers];
    const layer = allLayers.find((l) => l.id === layerId);
    if (layer) {
      this.selectLayer(layer);
    }
  }

  private loadLayerPreview(layer: OutputLayer): void {
    if (!layer.datalayerId) {
      this.removeRasterLayer();
      return;
    }

    this.dataLayersService.getPublicUrl(layer.datalayerId).subscribe({
      next: (url: string) => {
        const cogUrl = `cog://${url}`;
        const colorFn = this.generateColorFunction(layer);
        setColorFunction(url, colorFn);
        this.addRasterLayer(cogUrl);
      },
      error: (err: any) => {
        console.error('Failed to load layer preview:', err);
        this.snackBar.open(
          'Failed to load layer',
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  private generateColorFunction(layer: OutputLayer): ColorFunction {
    const styleData = layer.datalayer?.styles?.[0]?.data;
    if (styleData?.entries && styleData?.map_type) {
      return generateColorFunctionFromStyle(styleData as StyleJson);
    }

    // in case datalayer styles are missing generate some defaults
    if (layer.type === 'mpat') {
      const mpatColors: Record<number, [number, number, number]> = {
        10: [198, 219, 239],
        11: [33, 113, 181],
        20: [199, 233, 192],
        21: [35, 139, 69],
        30: [253, 208, 162],
        31: [217, 72, 1],
        40: [212, 185, 218],
        41: [122, 1, 119],
      };

      return (pixel: TypedArray, rgba: Uint8ClampedArray) => {
        const value = Math.round(pixel[0]);
        const color = mpatColors[value];
        if (color) {
          rgba[0] = color[0];
          rgba[1] = color[1];
          rgba[2] = color[2];
          rgba[3] = 255;
        } else {
          rgba[0] = 0;
          rgba[1] = 0;
          rgba[2] = 0;
          rgba[3] = 0;
        }
      };
    } else {
      const [scaleMin, scaleMax] = layer.scale || [0, 100];

      const colorStops: [number, [number, number, number]][] = [
        [0, [26, 152, 80]],
        [0.25, [145, 207, 96]],
        [0.5, [254, 224, 139]],
        [0.75, [252, 141, 89]],
        [1, [215, 48, 39]],
      ];

      return (pixel: TypedArray, rgba: Uint8ClampedArray) => {
        const rawValue = pixel[0];

        const normalizedValue = (rawValue - scaleMin) / (scaleMax - scaleMin);

        if (normalizedValue <= 0) {
          rgba[0] = colorStops[0][1][0];
          rgba[1] = colorStops[0][1][1];
          rgba[2] = colorStops[0][1][2];
          rgba[3] = 255;
          return;
        }
        if (normalizedValue >= 1) {
          const last = colorStops[colorStops.length - 1][1];
          rgba[0] = last[0];
          rgba[1] = last[1];
          rgba[2] = last[2];
          rgba[3] = 255;
          return;
        }

        let lower = colorStops[0];
        let upper = colorStops[1];
        for (let i = 1; i < colorStops.length; i++) {
          if (normalizedValue <= colorStops[i][0]) {
            lower = colorStops[i - 1];
            upper = colorStops[i];
            break;
          }
        }

        const t = (normalizedValue - lower[0]) / (upper[0] - lower[0]);
        rgba[0] = Math.round(lower[1][0] + t * (upper[1][0] - lower[1][0]));
        rgba[1] = Math.round(lower[1][1] + t * (upper[1][1] - lower[1][1]));
        rgba[2] = Math.round(lower[1][2] + t * (upper[1][2] - lower[1][2]));
        rgba[3] = 255;
      };
    }
  }

  private addRasterLayer(cogUrl: string): void {
    if (!this.mapLibreMap) return;

    this.removeRasterLayer();

    this.mapLibreMap.addSource('output-raster', {
      type: 'raster',
      url: cogUrl,
      tileSize: 256,
      minzoom: 4,
      maxzoom: 22,
    });

    const layers = this.mapLibreMap.getStyle().layers;
    let firstSymbolId: string | undefined;
    if (layers) {
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }
    }

    this.mapLibreMap.addLayer(
      {
        id: 'output-layer',
        type: 'raster',
        source: 'output-raster',
        paint: {
          'raster-opacity': this.opacity / 100,
          'raster-resampling': 'nearest',
        },
      },
      firstSymbolId
    );
  }

  private removeRasterLayer(): void {
    if (!this.mapLibreMap) return;

    if (this.mapLibreMap.getLayer('output-layer')) {
      this.mapLibreMap.removeLayer('output-layer');
    }
    if (this.mapLibreMap.getSource('output-raster')) {
      this.mapLibreMap.removeSource('output-raster');
    }
  }

  mapLoaded(map: MapLibreMap): void {
    this.mapLibreMap = map;

    if (this.selectedLayer) {
      this.selectLayer(this.selectedLayer);
    }
  }

  transformRequest: RequestTransformFunction = (
    url: string,
    resourceType?: ResourceType
  ) => {
    return addRequestHeaders(
      url,
      resourceType,
      this.authService.getAuthCookie()
    );
  };

  onOpacityChange(value: number): void {
    this.opacity = value;
    if (this.mapLibreMap?.getLayer('output-layer')) {
      this.mapLibreMap.setPaintProperty(
        'output-layer',
        'raster-opacity',
        value / 100
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/plan', this.planId, 'climate-foresight']);
  }

  downloadGeopackage(): void {
    if (!this.runId || this.downloading) return;

    if (this.downloadStatus === 'ready' && this.downloadUrl) {
      this.performDownload(this.downloadUrl);
      return;
    }

    // starts interval polling for download status
    this.checkDownloadStatus();
  }

  private checkDownloadStatus(): void {
    if (!this.runId) return;

    this.climateForesightService.getDownloadStatus(this.runId).subscribe({
      next: (response) => {
        this.downloadStatus = response.status;

        if (response.status === 'ready' && response.download_url) {
          this.downloadUrl = response.download_url;
          this.stopDownloadPolling();
          this.performDownload(response.download_url);
        } else if (
          response.status === 'processing' ||
          response.status === 'pending'
        ) {
          if (!this.downloadPollingInterval) {
            this.snackBar.open(
              'GeoPackage is being generated. This may take a few minutes.',
              'Dismiss',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            this.startDownloadPolling();
          }
        } else if (response.status === 'error') {
          this.snackBar.open(
            response.message || 'Failed to generate GeoPackage',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        }
      },
      error: (err) => {
        console.error('Failed to check download status:', err);
        this.snackBar.open(
          'Failed to check download status',
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
      },
    });
  }

  private startDownloadPolling(): void {
    this.stopDownloadPolling();
    this.downloadPollingInterval = setInterval(() => {
      if (!this.runId) {
        this.stopDownloadPolling();
        return;
      }

      this.climateForesightService.getDownloadStatus(this.runId).subscribe({
        next: (response) => {
          this.downloadStatus = response.status;

          if (response.status === 'ready' && response.download_url) {
            this.downloadUrl = response.download_url;
            this.stopDownloadPolling();
            this.performDownload(response.download_url);
          } else if (response.status === 'error') {
            this.stopDownloadPolling();
            this.snackBar.open(
              response.message || 'Failed to generate GeoPackage',
              'Dismiss',
              SNACK_ERROR_CONFIG
            );
          }
        },
        error: () => {
          // don't stop for transient errors
        },
      });
    }, 5000);
  }

  private performDownload(url: string): void {
    this.downloading = true;
    this.climateForesightService.downloadFromUrl(url).subscribe({
      next: (blob) => {
        const filename = `climate_foresight_${this.run?.name || this.runId}.zip`;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.downloading = false;
      },
      error: (err) => {
        console.error('Failed to download:', err);
        this.snackBar.open('Download failed', 'Dismiss', SNACK_ERROR_CONFIG);
        this.downloading = false;
      },
    });
  }

  get downloadButtonLabel(): string {
    if (this.downloading) {
      return 'Downloading...';
    }
    switch (this.downloadStatus) {
      case 'processing':
      case 'pending':
        return 'Generating GeoPackage...';
      case 'error':
        return 'Retry Download';
      default:
        return 'Download GeoPackage';
    }
  }

  get isMpatSelected(): boolean {
    return this.selectedLayer?.type === 'mpat';
  }

  /**
   * Get the map_type from the selected layer's style (VALUES, RAMP, INTERVALS).
   */
  get selectedLayerStyleType(): string | null {
    return this.selectedLayer?.datalayer?.styles?.[0]?.data?.map_type || null;
  }

  /**
   * Check if the selected layer uses a gradient (RAMP) style.
   */
  get isGradientStyle(): boolean {
    return this.selectedLayerStyleType === 'RAMP';
  }

  /**
   * Check if the selected layer has actual style data (not using fallback).
   */
  get hasStyleData(): boolean {
    const styleData = this.selectedLayer?.datalayer?.styles?.[0]?.data;
    return !!(styleData?.entries && styleData.entries.length > 0);
  }

  /**
   * Get legend entries for the currently selected layer from its style data.
   */
  get selectedLayerLegendEntries(): LegendEntry[] {
    const styleData = this.selectedLayer?.datalayer?.styles?.[0]?.data;
    if (!styleData?.entries || styleData.entries.length === 0) {
      return [
        { value: 100, label: '100', color: '' },
        { value: 50, label: '50', color: '' },
        { value: 0, label: '0', color: '' },
      ];
    }

    return [...styleData.entries]
      .sort((a, b) => b.value - a.value)
      .map((entry) => ({
        value: entry.value,
        label: entry.label || String(entry.value),
        color: entry.color,
      }));
  }

  /**
   * Build a CSS linear-gradient string from RAMP style entries (vertical, high to low).
   * Returns the gradient for use in [style.background].
   */
  get gradientStyleVertical(): string {
    const styleData = this.selectedLayer?.datalayer?.styles?.[0]?.data;
    if (!styleData?.entries || styleData.entries.length === 0) {
      return 'linear-gradient(to bottom, #1a9850, #fee08b, #d73027)';
    }

    const sortedEntries = [...styleData.entries].sort(
      (a, b) => a.value - b.value
    );

    const colors = sortedEntries.map((e) => e.color).join(', ');
    return `linear-gradient(to top, ${colors})`;
  }
}

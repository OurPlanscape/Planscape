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

import { ButtonComponent, SectionComponent } from '@styleguide';
import {
  ClimateForesightRun,
  DataLayer,
  GeoPackageDownloadStatus,
} from '@types';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { PlanState } from '@plan/plan.state';
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
import { environment } from '@env/environment';
import { MapConfigService } from '@maplibre-map/map-config.service';
import {
  SNACK_BOTTOM_NOTICE_CONFIG,
  SNACK_ERROR_CONFIG,
} from '@shared/constants';
import { SharedModule } from '@shared/shared.module';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatMenuModule } from '@angular/material/menu';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { ClimateForesightMapComponent } from '../climate-foresight-map/climate-foresight-map.component';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

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
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    SectionComponent,
    MatMenuModule,
    PopoverComponent,
    ClimateForesightMapComponent,
  ],
  providers: [
    // 1. Create a single instance of the subclass
    { provide: MapConfigState, useClass: MultiMapConfigState },

    // 2. Alias its own type to that same instance
    { provide: MultiMapConfigState, useExisting: MapConfigState },
    MapConfigService,
    DataLayersStateService,
  ],
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

  viewedLayer$ = this.dataLayersState.viewedDataLayer$;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router,
    private mapConfigState: MapConfigState,
    private planState: PlanState,
    private authService: AuthService,
    private climateForesightService: ClimateForesightService,
    private dataLayersState: DataLayersStateService,
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
          '<p>A scaled metric (0-100) that reflects a continuum of climate resilience strategies from the MPAT classification.</p><p>Areas categorized as:<ul><li>Monitor are closest to 0, indicating favorable current and future conditions.</li><li>Adapt and Protect are intermediate with equivalent weighting, representing balanced management strategies.</li><li>Transform is nearest to 100, highlighting areas where significant change is likely.</li></ul></p>',
      };
    }
  }

  selectLayer(layer: OutputLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
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
}

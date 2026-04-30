import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { delay, map, startWith, switchMap, take } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ButtonComponent,
  OpacitySliderComponent,
  SectionComponent,
} from '@styleguide';
import { ClimateForesightRun, GeoPackageDownloadStatus } from '@types';
import { DataLayer } from '@api/planscapeAPI.schemas';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { ClimateForesightService } from '@services';
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
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { SyncedMapsComponent } from '@app/maplibre-map/synced-maps/synced-maps.component';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { MultiMapControlComponent } from '@app/maplibre-map/multi-map-control/multi-map-control.component';
import { DataLayersRegistryService } from '@app/explore/data-layers-registry';
import { DynamicClimateLayersComponent } from '../dynamic-climate-layers/dynamic-climate-layers.component';
import { ClimateLayersComponent } from '../climate-layers/climate-layers.component';
import { MULTIMAP_STORAGE } from '@app/services/multimap-storage.token';
import { DrawService } from '@app/maplibre-map/draw.service';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';

export interface ResultsLayer {
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
    SyncedMapsComponent,
    MapNavbarComponent,
    OpacitySliderComponent,
    MultiMapControlComponent,
    DynamicClimateLayersComponent,
    ClimateLayersComponent,
    NavBarComponent,
  ],
  providers: [
    // 1. Create a single instance of the subclass
    { provide: MapConfigState, useClass: MultiMapConfigState },

    // 2. Alias its own type to that same instance
    { provide: MultiMapConfigState, useExisting: MapConfigState },
    MapConfigService,
    DrawService,
    { provide: MULTIMAP_STORAGE, useValue: false },
    BaseLayersStateService,
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

  mpatMatrixLayer: ResultsLayer | null = null;
  adaptProtectLayer: ResultsLayer | null = null;
  integratedConditionLayer: ResultsLayer | null = null;

  mapsArray$ = this.dataLayersRegistryService.size$.pipe(
    startWith(0),
    delay(0),
    map((layoutMode) =>
      Array.from({ length: layoutMode }, (_, mapNumber) => mapNumber + 1)
    )
  );

  selectedMapId$ = this.multimapStateService.selectedMapId$;

  layers: ResultsLayer[] = [];
  inputLayers: ResultsLayer[] = [];

  viewedLayer$ = this.dataLayersState.viewedDataLayer$;

  opacity$ = this.multimapStateService.dataLayersOpacity$;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private climateForesightService: ClimateForesightService,
    private dataLayersState: DataLayersStateService,
    private mapConfigService: MapConfigService,
    private multimapStateService: MultiMapConfigState,
    private snackBar: MatSnackBar,
    private dataLayersRegistryService: DataLayersRegistryService
  ) {
    this.mapConfigService.initialize();
    this.multimapStateService.setSelectedMap(1);
  }

  ngOnInit(): void {
    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.runId = +params['runId'];
      this.planId = +params['planId'];
      this.multimapStateService.setLayoutMode(1);
      this.multimapStateService.setAllowClickOnMap(true);
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
      .pipe(
        switchMap((run) => {
          const input_ids: number[] = run.input_datalayers.map(
            (l) => l.datalayer
          );
          return this.climateForesightService.getDataLayers().pipe(
            map((datalayers) => ({
              run,
              // Returning the input layers
              input_layers: datalayers.filter((d) => input_ids.includes(d.id)),
            }))
          );
        })
      )
      .subscribe({
        next: ({ run, input_layers }) => {
          this.run = run;
          this.inputLayers = input_layers.map(
            (layer): ResultsLayer => ({
              datalayer: layer,
              id: String(layer.id),
              name: layer.name,
              datalayerId: layer.id,
              type: 'continuous',
              group: 'primary',
            })
          );
          this.buildClimateLayers();
          this.breadcrumbService.breadcrumb$
            .pipe(take(1))
            .subscribe((breadcrumb) => {
              if (
                breadcrumb?.label !==
                `New Climate Foresight Analysis: ${run.name}`
              ) {
                this.breadcrumbService.updateBreadCrumb({
                  label: `New Climate Foresight Analysis: ${run.name}`,
                  backUrl: `/plan/${this.planId}/climate-foresight`,
                  icon: 'close',
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

  private buildClimateLayers(): void {
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

      this.layers = [
        this.mpatMatrixLayer,
        this.adaptProtectLayer,
        this.integratedConditionLayer,
      ];
    }
  }

  selectLayer(layer: ResultsLayer): void {
    if (layer.datalayer) {
      this.dataLayersState.selectDataLayer(layer.datalayer);
    }
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

  handleOpacityChange(newOpacity: number) {
    this.multimapStateService.updateDataLayersOpacity(newOpacity);
  }
}

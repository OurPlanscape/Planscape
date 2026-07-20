import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import {
  ChartComponent,
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  PopoverComponent,
  SectionComponent,
} from '@styleguide';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  buildPercentageBarData,
  getPercentageChartOptions,
  PercentageBarColor,
} from '@app/chart-helper';
import { FundingReportFooterComponent } from '../funding-report-footer/funding-report-footer.component';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import {
  BaseLayer,
  DataLayer,
  DEFAULT_FLAME_LENGTH_INTERVAL,
  FLAME_LENGTH_INTERVAL_OPTIONS,
  FlameLengthInterval,
  FundingReport,
  FundingReportBiomassVolumes,
  FundingReportDataLayers,
  FundingReportTimeSeriesMetric,
} from '@types';
import { FundingModuleService } from '@services/funding-module.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import {
  AetTileFigures,
  aggregateAetSummary,
  aggregateFlameLengthSummary,
  aggregateMetricSummary,
  hasFlameLengthData,
  hasMetricData,
} from './funding-report.helper';
import { FUNDING_TOOLTIPS, FundingTooltip } from './funding-tooltips';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FundingMapLayersComponent,
  MapLayer,
} from '../funding-map-layers/funding-map-layers.component';
import { ScrollSpyDirective } from '@app/standalone/scroll-spy-directive/scroll-spy.directive';
import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingReportToPdfService } from '../funding-report-to-pdf.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs';
import { SNACK_ERROR_CONFIG, SUPPORT_URL } from '@app/shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataLayersService, FileSaverService } from '@app/services';

/** Pause after the last keystroke before recalculating water availability. */
const WATER_DEBOUNCE_MS = 300;

/** Display name for the report's AET (water availability) data layer. */
const AET_LAYER_NAME =
  'Percentage change in water availability after treatment';

interface ChartConfig {
  data: ChartData<'bar'>;
  options: ChartOptions<'bar'>;
}

interface ReportSection {
  id: string;
  label: string;
}

@UntilDestroy()
@Component({
  selector: 'app-funding-report',
  standalone: true,
  imports: [
    CommonModule,
    FundingReportFooterComponent,
    FundingReportMapComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    SectionComponent,
    ChartComponent,
    ModalComponent,
    PopoverComponent,
    FundingReportMapComponent,
    FundingMapLayersComponent,
    InputFieldComponent,
    InputDirective,
    ReactiveFormsModule,
    MessageCardComponent,
    ScrollSpyDirective,
  ],
  providers: [FundingMapConfigState, FundingReportToPdfService],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent implements OnInit, OnChanges, OnDestroy {
  constructor(
    private pdfService: FundingReportToPdfService,
    private fundingMapConfigState: FundingMapConfigState,
    private fundingModuleService: FundingModuleService,
    private dataLayersStateService: DataLayersStateService,
    private baseLayersStateService: BaseLayersStateService,
    private snackbar: MatSnackBar,
    private fileSaverService: FileSaverService,
    private dataLayersService: DataLayersService
  ) {}

  /** The scrollable container holding the map + report sections. */
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  mapLoaded$ = this.fundingMapConfigState.mapLoaded$;

  /** True while a PDF is being generated, to disable the download control. */
  generatingPdf$ = new BehaviorSubject<boolean>(false);

  /** True while a Geopackage is being downloadeed, to disable the download control. */
  downloadingGeopackage$ = new BehaviorSubject<boolean>(false);

  sections: ReportSection[] = [];
  /** Section ids in document order, handed to the scrollspy directive. */
  sectionIds: string[] = [];

  activeId = '';
  /** Name of the section whose interactive tooltip was last opened. */
  tooltipName = '';

  /** Content (copy + learn-more links) for the currently open tooltip. */
  get currentTooltip(): FundingTooltip | undefined {
    return FUNDING_TOOLTIPS[this.tooltipName];
  }

  /**
   * Map layers shown per report section, keyed by section id. Populated from the
   * `funding_report` module on init; each entry stays an empty array until then.
   */
  sectionLayers: Record<string, MapLayer[]> = {
    carbon: [],
    wildfire: [],
    water: [],
    biomass: [],
  };

  /** Raster data layers (carbon/water/wildfire) by id, to drive the map on select. */
  private layersById = new Map<number, DataLayer>();
  /** Vector base layers (biomass) by id, to toggle on the map on select. */
  private baseLayersById = new Map<number, BaseLayer>();

  /**
   * Id of the raster layer currently shown on the map (from the shared
   * data-layer state), or null. Drives the single-select sections' radio groups
   * so only the active layer stays selected, even across sections.
   */
  viewedLayerId$ = this.dataLayersStateService.viewedDataLayer$.pipe(
    map((layer) => layer?.id ?? null)
  );

  /**
   * Ids of the base layers currently shown on the map (shared base-layer state).
   * Drives the biomass section's multi-select checkboxes.
   */
  selectedBaseLayerIds$ = this.baseLayersStateService.selectedBaseLayers$.pipe(
    map((layers) => layers?.map((layer) => layer.id) ?? [])
  );

  /**
   * Id of the raster layer currently loading onto the map, wrapped in an array
   * so the single-select sections can show a spinner next to it. The data-layer
   * loading flag is global, so it's paired with the viewed layer's id: only the
   * active layer (in whichever section owns it) spins.
   */
  loadingLayerIds$ = combineLatest([
    this.viewedLayerId$,
    this.dataLayersStateService.loadingLayer$,
  ]).pipe(
    map(([layerId, loading]) => (loading && layerId !== null ? [layerId] : []))
  );

  /**
   * Ids of the base layers currently loading onto the map, for the biomass
   * multi-select spinners. The base-layer state tracks these as `source_<id>`
   * strings, so they're parsed back to numeric ids here.
   */
  loadingBaseLayerIds$ = this.baseLayersStateService.loadingLayers$.pipe(
    map((ids) => ids.map((id) => Number(id.replace('source_', ''))))
  );

  /** Flame length interval options for the selector. */
  flameLengthOptions = FLAME_LENGTH_INTERVAL_OPTIONS;
  /** The interval whose pre-calculated reduction the chart currently shows. */
  flameLengthInterval = new FormControl<FlameLengthInterval>(
    DEFAULT_FLAME_LENGTH_INTERVAL,
    { nonNullable: true }
  );

  waterAvailabilityControl = new FormControl<number | null>(
    25,
    Validators.required
  );

  @Input() showMap = true;
  @Input() showFooter = true;
  @Input() reportType: 'preview' | 'full' = 'preview';
  @Input() report!: FundingReport;
  /** Selected project area ids; empty means show the whole-scenario summary. */
  @Input() projectAreas: number[] = [];
  /**
   * The element that actually scrolls the report. When the report is embedded
   * in a host that owns the scroll (e.g. full-report-view), the host passes its
   * scroll container here. Defaults to the component's own `#scrollContainer`,
   * which is the scroller in the standalone/preview layout.
   */
  @Input() scrollElement?: HTMLElement;
  /** While true, a loader covers the water stat cards (recalc in flight). */
  @Input() updatingWaterAvailability = false;

  // todo datalayer probably
  @Output() showLayer = new EventEmitter<number>();
  @Output() updateWaterAvailability = new EventEmitter<number>();

  ngOnInit(): void {
    Chart.register(ChartDataLabels);
    this.assignSections();
    this.loadSectionLayers();

    // Recalculate water availability as the user types, after a short pause.
    this.waterAvailabilityControl.valueChanges
      .pipe(
        debounceTime(WATER_DEBOUNCE_MS),
        distinctUntilChanged(),
        filter((value): value is number => value !== null),
        untilDestroyed(this)
      )
      .subscribe((value) => this.updateWaterAvailability.emit(value));

    // Redraw the flame length chart from the already-loaded report whenever the
    // user picks a different interval — no recalculation request needed.
    this.flameLengthInterval.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe(() => this.buildFlameLengthChart());
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Fires before ngOnInit on first render, so this also does the initial build.
    // Redraw whenever the report or the selected project areas change.
    if (changes['report'] || changes['projectAreas']) {
      this.buildCharts();
    }
  }

  assignSections() {
    if (this.reportType === 'preview') {
      this.sections.push({ id: 'map', label: 'Map' });
    }
    this.sections.push(
      ...[
        { id: 'carbon', label: 'Carbon' },
        { id: 'wildfire', label: 'Wildfire Risk' },
        { id: 'water', label: 'Water' },
        { id: 'biomass', label: 'Biomass' },
      ]
    );
    this.sectionIds = this.sections.map((s) => s.id);
    this.activeId = this.sections[0].id;
  }

  /**
   * Fetch the `funding_report` module and fan its data layers out to the
   * matching report sections. The module groups layers under
   * `wildfire_risk_reduction`, which maps to this report's `wildfire` section.
   */
  private loadSectionLayers(): void {
    this.fundingModuleService
      .loadFundingModule()
      .pipe(untilDestroyed(this))
      .subscribe((module) => {
        const datalayers: FundingReportDataLayers = module.options.datalayers;
        this.sectionLayers = {
          carbon: this.toMapLayers(datalayers.carbon),
          wildfire: this.toMapLayers(datalayers.wildfire_risk_reduction),
          // The water section shows the report's own AET layer (a bare id),
          // not the module's water layers.
          water: this.waterMapLayers(),
          biomass: this.toBaseMapLayers(datalayers.biomass),
        };
        // Raster sections drive the single-select data-layer state.
        this.layersById = new Map(
          [...datalayers.carbon, ...datalayers.wildfire_risk_reduction].map(
            (layer) => [layer.id, layer]
          )
        );
        // Biomass (vector) layers drive the multi-select base-layer state.
        this.baseLayersById = new Map(
          datalayers.biomass.map((layer) => [layer.id, layer])
        );
      });
  }

  /** Reduce raster data layers to the id/name the radio selector needs. */
  private toMapLayers(layers: DataLayer[] = []): MapLayer[] {
    return layers.map((layer) => ({ id: layer.id, name: layer.name }));
  }

  /**
   * The water section's single map layer, built from the report's `aet_datalayer`
   * id with a hardcoded name. Empty when the report carries no AET layer.
   */
  private waterMapLayers(): MapLayer[] {
    const id = this.report?.aet_datalayer;
    return id != null ? [{ id, name: AET_LAYER_NAME }] : [];
  }

  /** Reduce vector base layers to id/name plus the swatch colors for checkboxes. */
  private toBaseMapLayers(layers: BaseLayer[] = []): MapLayer[] {
    return layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      color: layer.styles[0]?.data['fill-color'],
      outlineColor: layer.styles[0]?.data['fill-outline-color'],
    }));
  }

  ngOnDestroy(): void {
    Chart.unregister(ChartDataLabels);
  }

  private readonly labels = [0, 5, 10, 15, 20];
  private readonly xAxisLabel = 'Years Since Treatment';

  /** Rebuilt in `ngOnChanges` whenever the report or selected project areas change. */
  smokeChart!: ChartConfig;
  treeCarbonChart!: ChartConfig;
  flameLengthChart!: ChartConfig;

  /**
   * Whether each chart has any data for the current selection. When false the
   * chart is hidden and the no-data message is shown instead.
   */
  smokeHasData = false;
  treeCarbonHasData = false;
  flameLengthHasData = false;

  /**
   * Estimated biomass volumes for the current selection, or undefined when the
   * report carries no biomass data. Rebuilt alongside the charts.
   */
  biomass?: FundingReportBiomassVolumes;

  private buildCharts(): void {
    this.smokeChart = this.buildSummaryChart('POTENTIAL_SMOKE', 'blue');
    this.treeCarbonChart = this.buildSummaryChart(
      'ABOVEGROUND_TOTAL',
      'purple'
    );
    this.buildFlameLengthChart();

    this.smokeHasData = this.metricHasData('POTENTIAL_SMOKE');
    this.treeCarbonHasData = this.metricHasData('ABOVEGROUND_TOTAL');

    // Biomass, like the water (AET) section, is always shown as the
    // whole-scenario summary and is deliberately NOT broken down by the
    // selected project areas.
    this.biomass = this.report?.results?.summary?.BIOMASS_VOLUMES;
  }

  /**
   * Build the flame length chart from the report's pre-calculated reduction for
   * the selected interval. Called on report/selection changes and whenever the
   * interval selector changes.
   */
  private buildFlameLengthChart(): void {
    const results = this.report?.results;
    const interval = this.flameLengthInterval.value;
    // delta can be null when an interval had no valid pixels; treat it as 0.
    const deltas = results
      ? aggregateFlameLengthSummary(results, interval, this.projectAreas).map(
          (point) => point.delta ?? 0
        )
      : [];
    this.flameLengthChart = {
      data: buildPercentageBarData(this.labels, deltas, 'orange'),
      options: getPercentageChartOptions(
        this.xAxisLabel,
        deltas.length ? deltas : undefined
      )!,
    };
    this.flameLengthHasData =
      !!results && hasFlameLengthData(results, interval, this.projectAreas);
  }

  /** True when the metric has any non-null data over the current selection. */
  private metricHasData(metric: FundingReportTimeSeriesMetric): boolean {
    const results = this.report?.results;
    return !!results && hasMetricData(results, metric, this.projectAreas);
  }

  /** Build a bar chart from a report metric: one bar per year, value = % delta. */
  private buildSummaryChart(
    metric: FundingReportTimeSeriesMetric,
    color: PercentageBarColor
  ): ChartConfig {
    const deltas = this.deltasForMetric(metric);
    return {
      data: buildPercentageBarData(this.labels, deltas, color),
      options: getPercentageChartOptions(
        this.xAxisLabel,
        deltas.length ? deltas : undefined
      )!,
    };
  }

  /** Per-year % deltas for a metric over the currently selected project areas. */
  private deltasForMetric(metric: FundingReportTimeSeriesMetric): number[] {
    const results = this.report?.results;
    if (!results) {
      return [];
    }
    // delta can be null when a metric had no valid pixels; treat it as 0.
    return aggregateMetricSummary(results, metric, this.projectAreas).map(
      (point) => point.delta ?? 0
    );
  }

  onLayerSelected(layer: MapLayer): void {
    // Apply the chosen layer to the shared data-layer state. The funding report
    // map reads `viewedDataLayer$` from this same service (provided at the
    // scenario module level, shared with the Data Layers tab), so this renders
    // the layer on the map and shows its label.
    const dataLayer = this.layersById.get(layer.id);
    if (dataLayer) {
      this.dataLayersStateService.selectDataLayer(dataLayer);
    } else {
      // The water (AET) layer comes from the report as a bare id, not the
      // module, so it isn't preloaded in `layersById` — fetch the full data
      // layer before handing it to the shared state to render.
      this.dataLayersService
        .getDataLayerById(layer.id)
        .pipe(untilDestroyed(this))
        .subscribe((fetched) =>
          this.dataLayersStateService.selectDataLayer(fetched)
        );
    }
    this.showLayer.emit(layer.id);
  }

  /**
   * Toggle a biomass (vector) layer on the map via the shared base-layer state,
   * the same plumbing the Base Layers tab and Ownership layers use. `isMulti`
   * is true so multiple mills layers can be shown at once.
   */
  onBaseLayerToggled(layer: MapLayer): void {
    const baseLayer = this.baseLayersById.get(layer.id);
    if (baseLayer) {
      this.baseLayersStateService.updateBaseLayers(baseLayer, true);
    }
  }

  /** Keep the water availability field numeric (max 3 digits), updating validity as the user types. */
  onWaterAvailabilityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '').slice(0, 3);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    this.waterAvailabilityControl.setValue(
      sanitized === '' ? null : Number(sanitized)
    );
  }

  get isPreview() {
    return this.reportType === 'preview';
  }

  /**
   * Whether the preview map will render. When it does, the download control
   * stays disabled until the map reports it has loaded (the export captures the
   * map canvas). Derived from stable state so the footer's disabled binding
   * never changes mid-change-detection.
   */
  get willShowMap(): boolean {
    return this.isPreview && !!this.report?.treatment_datalayer;
  }

  /** Export the report (map + sections) as a PDF. */
  async exportPdf(): Promise<void> {
    if (this.generatingPdf$.value === true) {
      return;
    }
    this.generatingPdf$.next(true);
    try {
      // In the dashboard preview the map is inside the captured sections. In the
      // full view it lives in a sibling pane, so grab its canvas to draw on top.
      const mapCanvas = this.isPreview
        ? null
        : document.querySelector<HTMLCanvasElement>('.maplibregl-canvas');
      await this.pdfService.exportReport(
        this.scrollContainer.nativeElement,
        `planscape-funding-report-${this.report.scenario}`,
        mapCanvas
      );
    } catch (error) {
      this.displayDownloadErrorSnackbar();
    } finally {
      this.generatingPdf$.next(false);
    }
  }

  displayDownloadErrorSnackbar() {
    const snackBarConfig = {
      ...SNACK_ERROR_CONFIG,
      verticalPosition: 'bottom' as const,
    };

    const downloadErrorSnackbar = this.snackbar.open(
      'Unable to download.',
      'Submit Feedback',
      snackBarConfig
    );

    downloadErrorSnackbar.onAction().subscribe(() => {
      window.open(SUPPORT_URL, '_blank');
    });
  }

  downloadGeopackage() {
    // if we presume it's failed before the click
    if (
      !this.report.geopackage_status ||
      this.report.geopackage_status === 'FAILED'
    ) {
      this.displayDownloadErrorSnackbar();
    }
    this.downloadingGeopackage$.next(true);
    const filename = `geopackage-${this.report.scenario.toString()}.gpkg`;

    if (this.report.geopackage_url) {
      this.fileSaverService
        .downloadGeopackage(this.report.geopackage_url)
        .subscribe({
          next: (data) => {
            this.downloadingGeopackage$.next(false);
            const blob = new Blob([data], {
              type: 'application/zip',
            });
            this.fileSaverService.saveAs(blob, filename);
          },
          error: (e) => {
            this.downloadingGeopackage$.next(false);
            console.error('Error downloading: ', e);
            // if it's failed for some other reason, after the click
            this.displayDownloadErrorSnackbar();
          },
        });
    }
  }

  /**
   * Water (AET) figures for the template, if the report carries them.
   *
   * Like the time-series metrics (smoke, carbon, flame length), the water
   * figures are re-aggregated over the selected `projectAreas`: the acres are
   * summed from the per-project breakdown and expressed as a percent of the
   * whole planning area. An empty selection shows the whole-scenario summary.
   */
  get water(): AetTileFigures | undefined {
    const summary = this.report?.results?.summary?.AET;
    if (!summary) {
      return undefined;
    }
    return aggregateAetSummary(
      summary,
      this.report?.results?.projects?.AET ?? [],
      this.projectAreas
    );
  }
}

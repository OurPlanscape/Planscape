import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
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
  FundingReportAETSummary,
  FundingReportBiomassVolumes,
  FundingReportDataLayers,
  FundingReportTimeSeriesMetric,
} from '@types';
import { FundingModuleService } from '@services/funding-module.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import {
  aggregateBiomassVolumes,
  aggregateFlameLengthSummary,
  aggregateMetricSummary,
  hasFlameLengthData,
  hasMetricData,
} from './funding-report.helper';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FundingMapLayersComponent,
  MapLayer,
} from '../funding-map-layers/funding-map-layers.component';
import { ScrollSpyDirective } from '@app/standalone/scroll-spy-directive/scroll-spy.directive';
import { FundingMapConfigState } from '../funding-map-config-state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs';

/** Pause after the last keystroke before recalculating water availability. */
const WATER_DEBOUNCE_MS = 300;

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
  providers: [FundingMapConfigState],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent implements OnInit, OnChanges, OnDestroy {
  sections: ReportSection[] = [];
  /** Section ids in document order, handed to the scrollspy directive. */
  sectionIds: string[] = [];

  activeId = '';
  /** Name of the section whose interactive tooltip was last opened. */
  tooltipName = '';

  readonly tooltipCopy: Record<string, string> = {
    Carbon: `
       Carbon metrics are estimated using the Forest Vegetation Simulator
       (FVS) with spatially explicit forest conditions from the USFS
       TreeMap dataset (30 m resolution).
       TreeMap (2022 baseline) is projected to the 2025 modeling start year,
       and pre- and post-treatment scenarios are simulated in 5-year time steps to
       quantify changes in standing live aboveground carbon and potential smoke emissions relative to baseline.
      `,
    Water: `Change in Water Availability is calculated as the difference between pre- and post-treatment AETmax surfaces.
    Lower post-treatment AETmax indicates reduced vegetation water use and therefore greater water availability
    following treatment.`,
    Biomass: `Biomass is estimated using the Forest Vegetation Simulator (FVS) with 30 m USFS TreeMap data.
    The 2022 baseline is projected to 2025, and pre- and post-treatment scenarios are simulated to estimate
    available merchantable and non-merchantable biomass, reported by hardwood, softwood, and mixed forest types.`,
    'Flame Length': `Estimated using the Forest Vegetation Simulator (FVS) with 30 m USFS TreeMap data.
    The 2022 baseline is projected to 2025, and pre- and post-treatment scenarios are simulated in 5-year increments.
    Results show the area where modeled flame lengths are reduced from >4 feet to <4 feet relative to baseline.`,
  };

  /** HTML copy for the currently open tooltip; empty when none is defined. */
  get currentTooltipCopy(): string {
    return this.tooltipCopy[this.tooltipName] ?? '';
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

  constructor(
    private fundingModuleService: FundingModuleService,
    private dataLayersStateService: DataLayersStateService,
    private baseLayersStateService: BaseLayersStateService
  ) {}

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
          water: this.toMapLayers(datalayers.water),
          biomass: this.toBaseMapLayers(datalayers.biomass),
        };
        // Raster sections drive the single-select data-layer state.
        this.layersById = new Map(
          [
            ...datalayers.carbon,
            ...datalayers.wildfire_risk_reduction,
            ...datalayers.water,
          ].map((layer) => [layer.id, layer])
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

    const results = this.report?.results;
    this.biomass = results
      ? aggregateBiomassVolumes(results, this.projectAreas)
      : undefined;
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
   * Water (AET) figures for the template, if the report carries them.
   *
   * Unlike the time-series metrics (smoke, carbon, flame length), AET is always
   * shown as the whole-scenario summary and is NOT broken down by the selected
   * `projectAreas`. The backend also returns a per-project AET breakdown, but
   * the FE deliberately doesn't model or read it, so the water section stays the
   * same whatever the project-area filter is set to.
   */
  get water(): FundingReportAETSummary | undefined {
    return this.report?.results?.summary?.AET;
  }
}

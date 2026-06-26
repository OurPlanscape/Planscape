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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import {
  ButtonComponent,
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
  FlameLengthRequestParams,
  FundingReport,
  FundingReportAETSummary,
  FundingReportBiomassVolumes,
  FundingReportMetric,
  ORIGIN_TYPE,
} from '@types';
import {
  aggregateBiomassVolumes,
  aggregateMetricSummary,
  hasMetricData,
} from './funding-report.helper';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  FundingMapLayersComponent,
  MapLayer,
} from '../funding-map-layers/funding-map-layers.component';
import { ScrollSpyDirective } from '@app/standalone/scroll-spy-directive/scroll-spy.directive';
import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingReportToPdfService } from '../funding-report-to-pdf.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';

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

/** The "greater than" threshold must be above the "lesser than" one. */
const flameLengthRangeValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const greaterThan = group.get('greaterThan')?.value;
  const lesserThan = group.get('lesserThan')?.value;
  // Empties are handled by the per-field required validators.
  if (greaterThan === null || lesserThan === null) {
    return null;
  }
  return greaterThan > lesserThan ? null : { range: true };
};

@UntilDestroy()
@Component({
  selector: 'app-funding-report',
  standalone: true,
  imports: [
    CommonModule,
    FundingReportFooterComponent,
    FundingReportMapComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
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
    ButtonComponent,
  ],
  providers: [FundingMapConfigState, FundingReportToPdfService],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent implements OnInit, OnChanges, OnDestroy {
  constructor(private pdfService: FundingReportToPdfService) {}

  /** The scrollable container holding the map + report sections. */
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  /** True while a PDF is being generated, to disable the download control. */
  generatingPdf = false;

  sections: ReportSection[] = [];
  /** Section ids in document order, handed to the scrollspy directive. */
  sectionIds: string[] = [];

  activeId = '';
  /** Name of the section whose interactive tooltip was last opened. */
  tooltipName = '';

  // TODO placeholder
  mapLayers: MapLayer[] = [
    { id: 1, name: 'Placeholder' },
    { id: 2, name: 'Placeholder' },
  ];

  flameLengthForm = new FormGroup(
    {
      greaterThan: new FormControl<number | null>(7, Validators.required),
      lesserThan: new FormControl<number | null>(4, Validators.required),
    },
    { validators: flameLengthRangeValidator }
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
   * Scenario origin. Decides which per-project field the selected
   * `projectAreas` ids are matched against: `project_id` for USER scenarios,
   * `proj_id` (treatment rank) for SYSTEM ones.
   */
  @Input() origin: ORIGIN_TYPE = 'USER';
  /**
   * The element that actually scrolls the report. When the report is embedded
   * in a host that owns the scroll (e.g. full-report-view), the host passes its
   * scroll container here. Defaults to the component's own `#scrollContainer`,
   * which is the scroller in the standalone/preview layout.
   */
  @Input() scrollElement?: HTMLElement;
  /** While true, a loader covers the flame length chart (recalc in flight). */
  @Input() updatingFlameLength = false;
  /** While true, a loader covers the water stat cards (recalc in flight). */
  @Input() updatingWaterAvailability = false;

  // todo datalayer probably
  @Output() showLayer = new EventEmitter<number>();
  @Output() updateWaterAvailability = new EventEmitter<number>();
  @Output() updateFlameLength = new EventEmitter<FlameLengthRequestParams>();

  ngOnInit(): void {
    Chart.register(ChartDataLabels);
    this.assignSections();

    // Recalculate water availability as the user types, after a short pause.
    this.waterAvailabilityControl.valueChanges
      .pipe(
        debounceTime(WATER_DEBOUNCE_MS),
        distinctUntilChanged(),
        filter((value): value is number => value !== null),
        untilDestroyed(this)
      )
      .subscribe((value) => this.updateWaterAvailability.emit(value));
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
    this.flameLengthChart = this.buildSummaryChart(
      'TOTAL_FLAME_SEVERITY',
      'orange'
    );

    this.smokeHasData = this.metricHasData('POTENTIAL_SMOKE');
    this.treeCarbonHasData = this.metricHasData('ABOVEGROUND_TOTAL');
    this.flameLengthHasData = this.metricHasData('TOTAL_FLAME_SEVERITY');

    const results = this.report?.results;
    this.biomass = results
      ? aggregateBiomassVolumes(results, this.projectAreas, this.origin)
      : undefined;
  }

  /** True when the metric has any non-null data over the current selection. */
  private metricHasData(metric: FundingReportMetric): boolean {
    const results = this.report?.results;
    return (
      !!results &&
      hasMetricData(results, metric, this.projectAreas, this.origin)
    );
  }

  /** Build a bar chart from a report metric: one bar per year, value = % delta. */
  private buildSummaryChart(
    metric: FundingReportMetric,
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
  private deltasForMetric(metric: FundingReportMetric): number[] {
    const results = this.report?.results;
    if (!results) {
      return [];
    }
    // delta can be null when a metric had no valid pixels; treat it as 0.
    return aggregateMetricSummary(
      results,
      metric,
      this.projectAreas,
      this.origin
    ).map((point) => point.delta ?? 0);
  }

  onLayerSelected(layer: MapLayer): void {
    // TODO: drive the map / section-specific behavior off the selected layer.
    this.showLayer.emit(layer.id);
  }

  /** Keep the flame length fields numeric, updating validity as the user types. */
  onFlameLengthInput(event: Event, key: 'greaterThan' | 'lesserThan'): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '');
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    this.flameLengthForm.controls[key].setValue(
      sanitized === '' ? null : Number(sanitized)
    );
  }

  /** Emit the flame length thresholds (feet) once the whole form is valid. */
  emitFlameLength(): void {
    if (this.flameLengthForm.invalid) {
      return;
    }
    const { greaterThan, lesserThan } = this.flameLengthForm.getRawValue();
    if (greaterThan === null || lesserThan === null) {
      return;
    }
    this.updateFlameLength.emit({ from_ft: greaterThan, to_ft: lesserThan });
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

  /** Export the report (map + sections) as a PDF. */
  async exportPdf(): Promise<void> {
    if (this.generatingPdf) {
      return;
    }
    this.generatingPdf = true;
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
    } finally {
      this.generatingPdf = false;
    }
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

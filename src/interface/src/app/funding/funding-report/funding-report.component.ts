import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
import { FundingReport, FundingReportMetric } from '@types';
import { aggregateMetricSummary, hasMetricData } from './funding-report.helper';
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

@Component({
  selector: 'app-funding-report',
  standalone: true,
  imports: [
    CommonModule,
    FundingReportFooterComponent,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    SectionComponent,
    ButtonComponent,
    ChartComponent,
    ModalComponent,
    PopoverComponent,
    FundingMapLayersComponent,
    InputFieldComponent,
    InputDirective,
    ReactiveFormsModule,
    MessageCardComponent,
  ],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  @ViewChild('scrollContainer', { static: true })
  scrollContainer!: ElementRef<HTMLElement>;

  sections: ReportSection[] = [];

  activeId = '';
  /** Name of the section whose interactive tooltip was last opened. */
  tooltipName = '';

  // TODO placeholder
  mapLayers: MapLayer[] = [
    { id: 1, name: 'Water Availability with No Treatment' },
    { id: 2, name: 'Water Availability with Treatment' },
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

  /** Scrollspy: notifies when sections cross the active line. No scroll listener. */
  private observer?: IntersectionObserver;
  /** Ids of sections currently below the active line, kept in sync by the observer. */
  private readonly visible = new Set<string>();
  /** Section a tab click is smooth-scrolling toward; spy holds here until it arrives. */
  private seekId: string | null = null;
  /** Safety release for `seekId` if the target is never reached (e.g. last section). */
  private seekDeadline = 0;
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

  // todo datalayer probably
  @Output() showLayer = new EventEmitter<number>();
  @Output() updateWaterAvailability = new EventEmitter<number>();
  @Output() updateFlameLength = new EventEmitter<{
    greaterThan: number;
    lesserThan: number;
  }>();

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    Chart.register(ChartDataLabels);
    this.assignSections();
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
    this.activeId = this.sections[0].id;
  }

  ngAfterViewInit(): void {
    const root = this.scrollElement ?? this.scrollContainer.nativeElement;
    // The active line sits where a clicked section lands: scroll-margin-top below
    // the scroll container's top. Reading it from CSS keeps spy and click in sync
    // and absorbs each layout's sticky offset (16 preview / 184 full).
    const first = document.getElementById(this.sections[0].id);
    const offset = first
      ? parseInt(getComputedStyle(first).scrollMarginTop, 10) || 0
      : 0;
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(this.onIntersect, {
        root,
        rootMargin: `-${offset}px 0px 0px 0px`,
        threshold: 0,
      });
      for (const s of this.sections) {
        const el = document.getElementById(s.id);
        if (el) this.observer.observe(el);
      }
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    Chart.unregister(ChartDataLabels);
  }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.activeId = id;
    // Hold the spy on this target so it doesn't flicker through the sections the
    // smooth scroll passes over; released when we arrive or after a safety delay.
    this.seekId = id;
    this.seekDeadline = Date.now() + 1500;
    // scroll-margin-top lands the section on the same line the spy reacts to,
    // and scrollIntoView resolves the final position regardless of how the
    // sticky elements are currently laid out — so it works even from the top.
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Active section = the first one still below the active line. */
  private onIntersect = (entries: IntersectionObserverEntry[]): void => {
    for (const e of entries) {
      if (e.isIntersecting) this.visible.add(e.target.id);
      else this.visible.delete(e.target.id);
    }

    const next = this.sections.find((s) => this.visible.has(s.id))?.id;
    if (!next) return;

    // While a tab-click scroll is in flight, hold on the target; release once we
    // reach it (or the safety deadline elapses).
    if (this.seekId) {
      if (next === this.seekId || Date.now() >= this.seekDeadline) {
        this.seekId = null;
      } else {
        return;
      }
    }

    if (next !== this.activeId) {
      this.zone.run(() => {
        this.activeId = next;
        this.cdr.markForCheck();
      });
    }
  };

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
  }

  /** True when the metric has any non-null data over the current selection. */
  private metricHasData(metric: FundingReportMetric): boolean {
    const results = this.report?.results;
    return !!results && hasMetricData(results, metric, this.projectAreas);
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
    return aggregateMetricSummary(results, metric, this.projectAreas).map(
      (point) => point.delta ?? 0
    );
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
    this.updateFlameLength.emit({ greaterThan, lesserThan });
  }

  /** Keep the water availability field numeric, updating validity as the user types. */
  onWaterAvailabilityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '');
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    this.waterAvailabilityControl.setValue(
      sanitized === '' ? null : Number(sanitized)
    );
  }

  /** Emit the water availability increase (%) once it is a valid number. */
  emitWaterAvailability(): void {
    const value = this.waterAvailabilityControl.value;
    if (value === null) {
      return;
    }
    this.updateWaterAvailability.emit(value);
  }

  get isPreview() {
    return this.reportType === 'preview';
  }
}

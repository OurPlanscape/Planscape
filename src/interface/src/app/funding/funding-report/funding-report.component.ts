import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import {
  BannerComponent,
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
import { map, Observable, of } from 'rxjs';
import {
  buildPercentageBarData,
  getPercentageChartOptions,
  PercentageBarColor,
} from '@app/chart-helper';
import { FundingReportFooterComponent } from '../funding-report-footer/funding-report-footer.component';
import { FundingReport, FundingReportMetric } from '@types';
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

interface ChartValues {
  burnProb: number[];
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
    BannerComponent,
    ModalComponent,
    PopoverComponent,
    FundingMapLayersComponent,
    InputFieldComponent,
    InputDirective,
    ReactiveFormsModule,
  ],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent
  implements OnInit, AfterViewInit, OnDestroy
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

  private suppressUntil = 0;
  private pendingScrollFrame: number | null = null;
  @Input() showMap = true;
  @Input() showFooter = true;
  @Input() reportType: 'preview' | 'full' = 'preview';
  @Input() report!: FundingReport;

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
    this.smokeChart$ = of(this.buildSummaryChart('POTENTIAL_SMOKE', 'blue'));
    this.treeCarbonChart$ = of(
      this.buildSummaryChart('ABOVEGROUND_TOTAL', 'purple')
    );
    this.flameLengthChart$ = of(
      this.buildSummaryChart('TOTAL_FLAME_SEVERITY', 'orange')
    );
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
    this.zone.runOutsideAngular(() => {
      this.scrollContainer.nativeElement.addEventListener(
        'scroll',
        this.onScroll,
        { passive: true }
      );
    });
    this.updateActiveNav();
  }

  ngOnDestroy(): void {
    this.scrollContainer?.nativeElement.removeEventListener(
      'scroll',
      this.onScroll
    );
    if (this.pendingScrollFrame !== null)
      cancelAnimationFrame(this.pendingScrollFrame);
    Chart.unregister(ChartDataLabels);
  }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.activeId = id;
    // mute scrollspy until smooth-scroll settles so it doesn't flicker
    // through intermediate sections
    this.suppressUntil = Date.now() + 700;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private onScroll = (): void => {
    if (this.pendingScrollFrame !== null) return;
    this.pendingScrollFrame = requestAnimationFrame(() => {
      this.pendingScrollFrame = null;
      if (Date.now() < this.suppressUntil) return;
      this.updateActiveNav();
    });
  };

  private updateActiveNav(): void {
    const containerTop =
      this.scrollContainer.nativeElement.getBoundingClientRect().top;
    // 80px is the height of the header approximately
    const activeLineY = containerTop + 80;

    let next = this.sections[0].id;
    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= activeLineY) {
        next = s.id;
      } else {
        break;
      }
    }

    if (next !== this.activeId) {
      this.zone.run(() => {
        this.activeId = next;
        this.cdr.markForCheck();
      });
    }
  }

  private readonly labels = [0, 5, 10, 15, 20];
  private readonly xAxisLabel = 'Years Since Treatment';

  // simulating an async source — swap for a real data service later
  readonly chartValues$: Observable<ChartValues> = of({
    burnProb: [70, 30, 25, 20, 16],
  });

  /** Built from the report summary in `ngOnInit`. */
  smokeChart$!: Observable<ChartConfig>;
  treeCarbonChart$!: Observable<ChartConfig>;
  flameLengthChart$!: Observable<ChartConfig>;
  readonly burnProbChart$ = this.buildChart$('burnProb', 'yellow');

  private buildChart$(
    key: keyof ChartValues,
    color: PercentageBarColor
  ): Observable<ChartConfig> {
    return this.chartValues$.pipe(
      map((values) => ({
        data: buildPercentageBarData(this.labels, values[key], color),
        options: getPercentageChartOptions(this.xAxisLabel, values[key])!,
      }))
    );
  }

  /** Build a bar chart from a report summary metric: one bar per year, value = delta. */
  private buildSummaryChart(
    metric: FundingReportMetric,
    color: PercentageBarColor
  ): ChartConfig {
    const points = this.report?.results?.summary[metric] ?? [];
    // delta can be null when a metric had no valid pixels; treat it as 0.
    const deltas = points.map((point) => point.delta ?? 0);
    return {
      data: buildPercentageBarData(this.labels, deltas, color),
      options: getPercentageChartOptions(
        this.xAxisLabel,
        deltas.length ? deltas : undefined
      )!,
    };
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

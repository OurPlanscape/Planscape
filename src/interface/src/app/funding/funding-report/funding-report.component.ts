import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import {
  BannerComponent,
  ButtonComponent,
  ChartComponent,
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

interface ChartConfig {
  data: ChartData<'bar'>;
  options: ChartOptions<'bar'>;
}

interface ChartValues {
  smoke: number[];
  treeCarbon: number[];
  flameLength: number[];
  burnProb: number[];
}

interface ReportSection {
  id: string;
  label: string;
}

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

  private suppressUntil = 0;
  private pendingScrollFrame: number | null = null;
  @Input() showMap = true;
  @Input() showFooter = true;
  @Input() reportType: 'preview' | 'full' = 'preview';

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    Chart.register(ChartDataLabels);
    this.assignSections();
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
    smoke: [-48, -23, -22, -18, -12],
    treeCarbon: [-50, -45, -28, -25, -15],
    flameLength: [71, 58, 32, 16, 14],
    burnProb: [70, 30, 25, 20, 16],
  });

  readonly smokeChart$ = this.buildChart$('smoke', 'blue');
  readonly treeCarbonChart$ = this.buildChart$('treeCarbon', 'purple');
  readonly flameLengthChart$ = this.buildChart$('flameLength', 'orange');
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
}

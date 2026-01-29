import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ButtonComponent, PanelComponent, SectionComponent } from '@styleguide';
import { Plan, ClimateForesightRun, DataLayer } from '@types';
import { ClimateForesightService } from '@services';
import { StepDirective } from '../../../../../styleguide/steps/step.component';
import { interval, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { chartTooltipBaseConfig } from 'src/app/chart-helper';

interface LayerFavorability {
  datalayer: number;
  favor_high: boolean | null;
}

@UntilDestroy()
@Component({
  selector: 'app-assign-favorability',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    PanelComponent,
    MatRadioModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgChartsModule,
    SectionComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: AssignFavorabilityComponent },
  ],
  templateUrl: './assign-favorability.component.html',
  styleUrls: ['./assign-favorability.component.scss'],
})
export class AssignFavorabilityComponent
  extends StepDirective<any>
  implements OnChanges
{
  @Input() plan: Plan | null = null;
  @Input() run: ClimateForesightRun | null = null;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() complete = new EventEmitter<any>();

  selectedDataLayers: DataLayer[] = [];
  favorabilityMap: Map<number, boolean | null> = new Map();
  currentLayerIndex: number = 0;

  private pollingInterval = 5_000;
  private statisticsReady$ = new Subject<void>();

  form = new FormGroup({
    favorability: new FormControl<LayerFavorability[]>(
      [],
      [Validators.required]
    ),
  });

  get currentLayer(): DataLayer | null {
    if (
      this.selectedDataLayers.length === 0 ||
      this.currentLayerIndex >= this.selectedDataLayers.length
    ) {
      return null;
    }
    return this.selectedDataLayers[this.currentLayerIndex];
  }

  get currentInputDataLayer() {
    if (!this.currentLayer || !this.run?.input_datalayers) {
      return null;
    }
    return this.run.input_datalayers.find(
      (input) => input.datalayer === this.currentLayer!.id
    );
  }

  get isCurrentLayerStatisticsReady(): boolean {
    const inputLayer = this.currentInputDataLayer;
    return inputLayer?.statistics != null;
  }

  get areAllStatisticsReady(): boolean {
    if (!this.run?.input_datalayers) return false;
    return this.run.input_datalayers.every((input) => input.statistics != null);
  }

  get canProceed(): boolean {
    return (
      this.selectedDataLayers.length > 0 &&
      this.selectedDataLayers.every((layer) => {
        const fav = this.favorabilityMap.get(layer.id);
        return fav != null;
      })
    );
  }

  get hasPreviousLayer(): boolean {
    return this.currentLayerIndex > 0;
  }

  get hasNextLayer(): boolean {
    return this.currentLayerIndex < this.selectedDataLayers.length - 1;
  }

  get chartData(): ChartConfiguration<'bar'>['data'] | null {
    if (!this.currentLayer) return null;

    const statistics = this.currentInputDataLayer?.statistics;
    if (!statistics || !statistics.original) return null;

    const stats = statistics.original;
    const { min, max, mean, std } = stats;

    const range = max - min;
    const bins = 14;
    const binWidth = range / bins;

    const labels: string[] = [];
    const data: number[] = [];

    // approximate normal distribution around the mean
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binCenter = binStart + binWidth / 2;
      labels.push(binCenter.toFixed(2));

      const zScore = (binCenter - mean) / (std || 1);
      const height = Math.exp(-0.5 * zScore * zScore);
      data.push(height);
    }

    const datasets: any[] = [
      {
        type: 'bar',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        order: 2,
      },
    ];

    const currentFavorability = this.getFavorability(this.currentLayer.id);

    // add line overlay if favorability is set
    if (currentFavorability !== null) {
      const { p10, p90 } = stats.percentiles;
      const favorHigh = currentFavorability;

      const lineColor = favorHigh
        ? 'rgba(54, 162, 235, 1)'
        : 'rgba(220, 53, 69, 1)';

      const lineData: Array<{ x: number; y: number }> = [];
      const pointRadii: number[] = [];

      // creates horizontal line, favorability slope, followed by horizontal line
      if (favorHigh) {
        // positive slope favoring high values
        lineData.push({ x: min, y: 0.1 });
        pointRadii.push(0);

        lineData.push({ x: p10, y: 0.1 });
        pointRadii.push(6);

        lineData.push({ x: p90, y: 1.0 });
        pointRadii.push(6);

        lineData.push({ x: max, y: 1.0 });
        pointRadii.push(0);
      } else {
        // negative slope favoring low values
        lineData.push({ x: min, y: 1.0 });
        pointRadii.push(0);

        lineData.push({ x: p10, y: 1.0 });
        pointRadii.push(6);

        lineData.push({ x: p90, y: 0.1 });
        pointRadii.push(6);

        lineData.push({ x: max, y: 0.1 });
        pointRadii.push(0);
      }

      datasets.push({
        type: 'line',
        data: lineData,
        borderColor: lineColor,
        backgroundColor: lineColor,
        borderWidth: 2,
        pointRadius: pointRadii,
        pointHoverRadius: pointRadii.map((r) => (r > 0 ? 8 : 0)),
        pointBackgroundColor: lineColor,
        pointBorderColor: lineColor,
        fill: false,
        tension: 0,
        order: 1,
      });
    }

    return {
      labels,
      datasets,
    };
  }

  get chartOptions(): ChartConfiguration<'bar'>['options'] {
    const xAxisLabel = this.getUnitsFromLayer();

    const SLOPE_MIN = 0.1;
    const SLOPE_MAX = 1.0;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...chartTooltipBaseConfig(),
          displayColors: true,
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 1) {
                return `Favorability: ${context.parsed.y.toFixed(2)}`;
              }
              return `Frequency: ${context.parsed.y.toFixed(3)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: xAxisLabel,
            color: '#898989',
            font: {
              size: 12,
            },
          },
          ticks: {
            color: '#4A4A4A',
            font: {
              size: 14,
              weight: '600',
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Favorability',
            color: '#898989',
            font: {
              size: 12,
              weight: '500',
            },
          },
          beginAtZero: true,
          min: 0,
          max: 1.1,

          afterBuildTicks: (axis) => {
            // We need to add the ticks for high and low
            const ticks = axis.ticks.map((t) => t.value);

            if (!ticks.includes(0.1)) {
              axis.ticks.push({ value: 0.1 });
            }

            if (!ticks.includes(1.0)) {
              axis.ticks.push({ value: 1.0 });
            }

            axis.ticks.sort((a, b) => a.value - b.value);
          },

          ticks: {
            color: '#4A4A4A',
            font: { size: 14, weight: '600' },
            callback: (value) => {
              if (value === SLOPE_MIN) return 'Low';
              if (value === SLOPE_MAX) return 'High';
              return '';
            },
          },

          grid: {
            display: true,
            color: 'rgba(0,0,0,0.05)',
          },
        },
      },
    };
  }

  get currentLayerStats() {
    if (!this.currentLayer) return null;
    return this.currentLayer.info?.stats?.[0] || null;
  }

  getUnitsFromLayer(): string {
    if (!this.currentLayer) {
      return '--';
    }

    const units = this.currentLayer.metadata?.['metadata']?.[
      'identification'
    ]?.keywords?.units?.keywords?.filter((unit: any) => !!unit);

    if (!units || units.length === 0) {
      return '--';
    }

    const unitsString = units.join(', ');

    if (unitsString === '0-1') {
      return '--';
    }

    return unitsString;
  }

  constructor(private climateForesightService: ClimateForesightService) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['run'] && this.run?.input_datalayers) {
      this.loadDataLayers();
      this.startPollingForStatistics();
    }
  }

  private loadDataLayers(): void {
    if (!this.run?.input_datalayers) return;

    const layerIds = this.run.input_datalayers.map(
      (config) => config.datalayer
    );

    this.climateForesightService.getDataLayers().subscribe({
      next: (layers: DataLayer[]) => {
        this.selectedDataLayers = layers.filter((layer) =>
          layerIds.includes(layer.id)
        );

        this.run!.input_datalayers!.forEach((config) => {
          this.favorabilityMap.set(config.datalayer, config.favor_high);
        });

        if (this.selectedDataLayers.length > 0) {
          this.currentLayerIndex = 0;
        }
      },
      error: (err: any) => {
        console.error('Failed to load data layers:', err);
      },
    });
  }

  selectLayer(index: number): void {
    if (index >= 0 && index < this.selectedDataLayers.length) {
      this.currentLayerIndex = index;
    }
  }

  previousLayer(): void {
    if (this.hasPreviousLayer) {
      this.currentLayerIndex--;
    }
  }

  nextLayer(): void {
    if (this.hasNextLayer) {
      this.currentLayerIndex++;
    }
  }

  getFavorability(layerId: number): boolean | null {
    return this.favorabilityMap.get(layerId) ?? null;
  }

  setFavorability(layerId: number, favorHigh: boolean): void {
    this.favorabilityMap.set(layerId, favorHigh);
    this.updateFormValue();
  }

  private updateFormValue(): void {
    const favorabilityAssignments: LayerFavorability[] = [];
    this.selectedDataLayers.forEach((layer) => {
      const favorHigh = this.favorabilityMap.get(layer.id);
      if (favorHigh !== null && favorHigh !== undefined) {
        favorabilityAssignments.push({
          datalayer: layer.id,
          favor_high: favorHigh,
        });
      }
    });

    this.form.patchValue({
      favorability: favorabilityAssignments,
    });
    this.form.markAsTouched();
  }

  getData() {
    const favorabilityAssignments: LayerFavorability[] = [];
    this.selectedDataLayers.forEach((layer) => {
      const favorHigh = this.favorabilityMap.get(layer.id);
      favorabilityAssignments.push({
        datalayer: layer.id,
        favor_high: favorHigh ?? null,
      });
    });

    return {
      favorability: favorabilityAssignments,
    };
  }

  saveAndContinue(): void {
    this.complete.emit(this.getData());
  }

  private startPollingForStatistics(): void {
    if (!this.run || this.areAllStatisticsReady) {
      return;
    }

    interval(this.pollingInterval)
      .pipe(
        untilDestroyed(this),
        takeUntil(this.statisticsReady$),
        switchMap(() => this.climateForesightService.getRun(this.run!.id))
      )
      .subscribe({
        next: (updatedRun) => {
          this.run = updatedRun;

          const allReady =
            updatedRun.input_datalayers?.every(
              (input) => input.statistics != null
            ) ?? false;

          if (allReady) {
            this.statisticsReady$.next();
            this.statisticsReady$.complete();
          }
        },
        error: (err) => {
          console.error('Error polling for statistics:', err);
        },
      });
  }
}

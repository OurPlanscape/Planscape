import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { SecondaryMetricColors } from '@types';
import {
  CustomChartDataset
} from 'src/app/chart-helper';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent {
  @Input() metrics: CustomChartDataset[] = [];
  colorMap = SecondaryMetricColors;
}

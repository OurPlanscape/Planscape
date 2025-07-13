import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

type SecondaryMetric = {
  name: string;
  color: string;
};

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent {
  @Input() metrics: SecondaryMetric[] = [];
}

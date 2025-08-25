import { Component, Input, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { getGroupedAttainment } from 'src/app/chart-helper';
import { ScenarioResult } from '@types';
import { ChartColorsService } from '../../../scenario/chart-colors.service';

@Component({
  selector: 'app-scenario-metrics-legend',
  standalone: true,
  imports: [NgFor],
  templateUrl: './scenario-metrics-legend.component.html',
  styleUrl: './scenario-metrics-legend.component.scss',
})
export class ScenarioMetricsLegendComponent implements OnInit {
  @Input() scenarioResult!: ScenarioResult;
  metrics: string[] = [];
  assignedColors: { [name: string]: string } = {};

  constructor(private colorService: ChartColorsService) {}

  ngOnInit() {
    this.assignedColors = this.colorService.getAssignedColors();

    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
  }
}

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
  assignedColors: { [key: string]: string } = {};

  constructor(private colorService: ChartColorsService) {}

  ngOnInit() {
    this.colorService.colorAssignments$.subscribe((colors) => {
      this.assignedColors = {};
      colors.forEach((color, name) => {
        this.assignedColors[name] = color;
      });
    });

    this.metrics = Object.keys(
      getGroupedAttainment(this.scenarioResult.result.features)
    );
  }
}

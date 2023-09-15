import { Component, Input } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { ChartData } from './chart-data';

@Component({
  selector: 'app-project-areas-metrics',
  templateUrl: './project-areas-metrics.component.html',
  styleUrls: ['./project-areas-metrics.component.scss'],
})
export class ProjectAreasMetricsComponent {
  @Input() data: ChartData[] = [];
  @Input() selectedCharts: ChartData[] = [];

  selectDataPoint(e: MatSelectChange, i: number) {
    this.selectedCharts[i] = e.value;
  }

  filterData(
    data: ChartData[],
    dataToFilter: ChartData[],
    currentChart: ChartData
  ): ChartData[] {
    return data.filter((d) => d === currentChart || !dataToFilter.includes(d));
  }
}

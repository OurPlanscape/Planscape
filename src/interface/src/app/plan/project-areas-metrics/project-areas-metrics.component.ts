import { Component, Input } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { ChartData } from './chart-data';
import { PlanService } from 'src/app/services';

@Component({
  selector: 'app-project-areas-metrics',
  templateUrl: './project-areas-metrics.component.html',
  styleUrls: ['./project-areas-metrics.component.scss'],
})
export class ProjectAreasMetricsComponent {
  @Input() data: ChartData[] = [];
  @Input() selectedCharts: ChartData[] = [];
  
  constructor(
    private planService: PlanService) {}
  selectDataPoint(e: MatSelectChange, i: number) {
    this.selectedCharts[i] = e.value;
  }

  toggleMapLayer(i: number) {
    this.planService.updateStateWithLegendUnits(this.selectedCharts[i]['measurement'])
    this.planService.updateStateWithConditionLayer(this.selectedCharts[i]['metric_layer'])
  }
  filterData(
    data: ChartData[],
    dataToFilter: ChartData[],
    currentChart: ChartData
  ): ChartData[] {
    return data.filter((d) => d === currentChart || !dataToFilter.includes(d));
  }
}

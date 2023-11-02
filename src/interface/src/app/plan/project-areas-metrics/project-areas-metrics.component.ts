import { Component, Input } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { ChartData } from './chart-data';
import { PlanService } from 'src/app/services';
import { map } from 'rxjs';

@Component({
  selector: 'app-project-areas-metrics',
  templateUrl: './project-areas-metrics.component.html',
  styleUrls: ['./project-areas-metrics.component.scss'],
})
export class ProjectAreasMetricsComponent {
  @Input() data: ChartData[] = [];
  @Input() selectedCharts: ChartData[] = [];

  mapConditionLayer$ = this.planService.planState$.pipe(
    map((planState) => planState.mapConditionLayer)
  );

  constructor(private planService: PlanService) {}

  selectDataPoint(e: MatSelectChange, i: number) {
    const showingThisLayer =
      this.planService.planState$.value.mapConditionLayer ===
      this.selectedCharts[i]['metric_layer'];

    this.selectedCharts[i] = e.value;
    if (showingThisLayer) {
      this.toggleMapLayer(i);
    }
  }

  toggleMapLayer(i: number) {
    const planState = this.planService.planState$.value;
    const measurement = this.selectedCharts[i]['measurement'];
    const legend = planState.legendUnits === measurement ? null : measurement;
    this.planService.updateStateWithLegendUnits(legend);
    const metric = this.selectedCharts[i]['metric_layer'];
    const condition = planState.mapConditionLayer === metric ? null : metric;

    this.planService.updateStateWithConditionLayer(condition);
  }

  filterData(
    data: ChartData[],
    dataToFilter: ChartData[],
    currentChart: ChartData
  ): ChartData[] {
    return data.filter((d) => d === currentChart || !dataToFilter.includes(d));
  }
}

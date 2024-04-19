import { Component, Input } from '@angular/core';
import { MatLegacySelectChange as MatSelectChange } from '@angular/material/legacy-select';
import { ChartData } from './chart-data';
import { map } from 'rxjs';
import { PlanStateService } from '@services';

@Component({
  selector: 'app-project-areas-metrics',
  templateUrl: './project-areas-metrics.component.html',
  styleUrls: ['./project-areas-metrics.component.scss'],
})
export class ProjectAreasMetricsComponent {
  @Input() data: ChartData[] = [];
  @Input() groupedData: { [category: string]: ChartData[] } | null = null;
  @Input() selectedCharts: ChartData[] = [];
  @Input() priorities: string[] = [];

  mapConditionLayer$ = this.planStateService.planState$.pipe(
    map((planState) => planState.mapConditionLayer)
  );

  constructor(private planStateService: PlanStateService) {}

  selectDataPoint(e: MatSelectChange, i: number) {
    const showingThisLayer =
      this.planStateService.planState$.value.mapConditionLayer ===
      this.selectedCharts[i]['metric_layer'];

    this.selectedCharts[i] = e.value;
    if (showingThisLayer) {
      this.toggleMapLayer(i);
    }
  }

  toggleMapLayer(i: number) {
    const planState = this.planStateService.planState$.value;
    const measurement = this.selectedCharts[i]['measurement'];
    const legend = planState.legendUnits === measurement ? null : measurement;
    this.planStateService.updateStateWithLegendUnits(legend);
    const metric = this.selectedCharts[i]['metric_layer'];
    const condition = planState.mapConditionLayer === metric ? null : metric;

    this.planStateService.updateStateWithConditionLayer(condition);
  }

  filterData(
    data: ChartData[],
    dataToFilter: ChartData[],
    currentChart: ChartData
  ): ChartData[] {
    return data.filter((d) => d === currentChart || !dataToFilter.includes(d));
  }
}

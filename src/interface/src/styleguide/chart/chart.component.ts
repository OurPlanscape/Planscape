import { Component, Input } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'sg-chart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
})
export class ChartComponent<TType extends ChartType = ChartType> {
  @Input() type!: TType;
  @Input() data!: ChartData<TType>;
  @Input() options?: ChartOptions<TType>;

  @Input() xAxisLabel = '';
  @Input() yAxisLabel = '';
}

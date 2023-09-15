import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-report-chart',
  templateUrl: './report-chart.component.html',
  styleUrls: ['./report-chart.component.scss'],
})
export class ReportChartComponent {
  @Input() label = '';
  @Input() values: number[] = [];
}

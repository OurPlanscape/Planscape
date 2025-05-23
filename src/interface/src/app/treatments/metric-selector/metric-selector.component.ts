import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Metric } from '../metrics';

@Component({
  selector: 'app-metric-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule],
  templateUrl: './metric-selector.component.html',
  styleUrl: './metric-selector.component.scss',
})
export class MetricSelectorComponent implements OnInit {
  @Input() label!: string;
  @Input() color!: string;
  @Input() metrics!: Metric[];
  @Input() selectedOption!: string;
  @Output() metricChanged = new EventEmitter<Metric>();

  selectedMetric: any;

  constructor() {}

  ngOnInit(): void {
    this.selectedMetric = this.metrics.find(
      (metric: any) => metric.id === this.selectedOption
    );
  }

  onSelect(selectedMetricID: any) {
    this.selectedMetric = this.metrics.find(
      (metric: any) => metric.id === selectedMetricID
    );
    this.metricChanged.emit(this.selectedMetric);
  }
}

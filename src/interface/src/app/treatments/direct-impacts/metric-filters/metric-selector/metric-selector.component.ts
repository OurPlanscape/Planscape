import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Metric } from '../metric-filters.component';
import { TreatmentsState } from 'src/app/treatments/treatments.state';

@Component({
  selector: 'app-metric-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule],
  templateUrl: './metric-selector.component.html',
  styleUrl: './metric-selector.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MetricSelectorComponent implements OnInit {
  @Input() label!: string;
  @Input() color!: string;
  @Input() metrics!: Metric[];
  @Input() selectedOption!: string;
  @Output() metricChanged = new EventEmitter<Metric>();
  @Output() activated = new EventEmitter<Metric>();

  selectedMetric: any;

  activeMetric$ = this.treatmentsState.activeMetric$;

  constructor(private treatmentsState: TreatmentsState) {}

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

  onActivate() {
    this.activated.emit(this.selectedMetric);
  }
}

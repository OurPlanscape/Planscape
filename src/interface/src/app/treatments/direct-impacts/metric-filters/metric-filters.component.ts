import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MetricSelectorComponent } from './metric-selector/metric-selector.component';
import { NgFor } from '@angular/common';
import {
  MapMetric,
  MapMetricSlot,
  Metric,
  METRICS,
  SLOT_COLORS,
} from '../../metrics';
import { TreatmentsState } from '../../treatments.state';

@Component({
  selector: 'app-metric-filters',
  standalone: true,
  imports: [NgFor, MetricSelectorComponent, MetricSelectorComponent],
  templateUrl: './metric-filters.component.html',
  styleUrl: './metric-filters.component.scss',
})
export class MetricFiltersComponent implements OnInit {
  @Output() metricSelected = new EventEmitter<MapMetric>();

  constructor(private treatmentsState: TreatmentsState) {}

  initialOptions: Metric[] = METRICS;

  metricColors = Object.entries(SLOT_COLORS).map(([key, value]) => ({
    key: key as MapMetricSlot,
    value,
  }));

  // Initializing every dropdown
  dropdownOptions: Metric[][] = [
    [...this.initialOptions],
    [...this.initialOptions],
    [...this.initialOptions],
    [...this.initialOptions],
  ];

  // Storing the selected IDs
  selectedOptions: string[] = [
    this.initialOptions[0].id,
    this.initialOptions[1].id,
    this.initialOptions[2].id,
    this.initialOptions[3].id,
  ];

  ngOnInit(): void {
    // Updating every list based on the default selected values
    this.updateDropdownOptions(null);
  }

  optionSelected(
    dropdownIndex: number,
    slot: MapMetricSlot,
    metric: Metric
  ): void {
    // Storing the selection
    this.selectedOptions[dropdownIndex] = metric.id;
    // Updating the dropdowns
    this.updateDropdownOptions(dropdownIndex);
    // setting the metric as active if slot is active
    if (this.treatmentsState.activeMetric$.value.slot === slot) {
      this.activateMetric(metric, slot);
    }
  }

  updateDropdownOptions(updatedDropdownIndex: number | null): void {
    // Updating every dropdown with the available options
    this.dropdownOptions = this.dropdownOptions.map(
      (list: Metric[], listIndex: number) => {
        // if the list is the same as the dropdown we are updating we want to keep it as it is
        if (listIndex === updatedDropdownIndex) {
          return list;
        }

        // Keeping the selected option if the dropdown already have value and is not the updated dropdown
        return this.initialOptions.filter(
          (m) =>
            !this.selectedOptions.includes(m.id) ||
            m.id === this.selectedOptions[listIndex]
        );
      }
    );
  }

  activateMetric(metric: Metric, slot: MapMetricSlot): void {
    this.metricSelected.emit({ metric, slot });
  }
}

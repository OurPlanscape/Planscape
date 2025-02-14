import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { AsyncPipe, NgFor } from '@angular/common';

import { MetricSelectorComponent } from '../metric-selector/metric-selector.component';
import {
  ImpactsMetric,
  ImpactsMetricSlot,
  Metric,
  METRICS,
  SLOT_COLORS,
} from '../metrics';
import { FilterDropdownComponent } from 'src/styleguide';

@Component({
  selector: 'app-metric-filters',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    MetricSelectorComponent,
    MetricSelectorComponent,
    FilterDropdownComponent,
  ],
  templateUrl: './metric-filters.component.html',
  styleUrl: './metric-filters.component.scss',
})
export class MetricFiltersComponent implements OnInit {
  @Input() selectedOptions: string[] = [];
  @Output() metricSelected = new EventEmitter<ImpactsMetric>();

  constructor() {}

  initialOptions: Metric[] = METRICS;

  metricColors = Object.entries(SLOT_COLORS).map(([key, value]) => ({
    key: key as ImpactsMetricSlot,
    value,
  }));

  // Initializing every dropdown
  dropdownOptions: Metric[][] = [
    [...this.initialOptions],
    [...this.initialOptions],
    [...this.initialOptions],
    [...this.initialOptions],
  ];

  ngOnInit(): void {
    // Updating every list based on the default selected values
    this.updateDropdownOptions(null);
  }

  optionSelected(
    dropdownIndex: number,
    slot: ImpactsMetricSlot,
    metric: Metric
  ): void {
    // Storing the selection
    this.selectedOptions[dropdownIndex] = metric.id;
    // Updating the dropdowns
    this.updateDropdownOptions(dropdownIndex);
    this.metricSelected.emit({ metric, slot });
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
}

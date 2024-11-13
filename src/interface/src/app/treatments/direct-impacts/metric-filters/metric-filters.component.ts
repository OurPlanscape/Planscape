import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MetricSelectorComponent } from './metric-selector/metric-selector.component';
import { NgFor } from '@angular/common';

export interface Metric {
  id: string;
  color: string;
  label: string;
}

export const METRICS: Metric[] = [
  {
    id: 'ID_CROWN_BULK_DENSITY',
    color: '',
    label: 'Crown Bulk Density',
  },
  {
    id: 'ID_CANOPY_BASE_HEIGHT',
    color: '',
    label: 'Canopy Base Height',
  },
  {
    id: 'ID_CANOPY_COVER',
    color: '',
    label: 'Canopy Cover',
  },
  {
    id: 'ID_LARGE_TREE_BIOMASS',
    color: '',
    label: 'Large Tree Biomass',
  },
  {
    id: 'ID_MERCHANTABLE_BIOMASS',
    color: '',
    label: 'Merchantable Biomass',
  },
  {
    id: 'ID_NON_MERCHANTABLE_BIOMASS',
    color: '',
    label: 'Non-Merchantable Biomass',
  },
  {
    id: 'ID_MORTALITY',
    color: '',
    label: 'Mortality',
  },
  {
    id: 'ID_POTENTIAL_SMOKE',
    color: '',
    label: 'Potential Smoke',
  },
  {
    id: 'ID_PROBABILITY_OF_TORCHING',
    color: '',
    label: 'Probability of Torching',
  },
  {
    id: 'ID_QUADRATIC_MEAN_DIAMETER',
    color: '',
    label: 'Quadratic Mean Diameter',
  },
  {
    id: 'ID_STAND_DENSITY_INDEX',
    color: '',
    label: 'Stand Density Index',
  },
  {
    id: 'ID_TOTAL_HEIGHT',
    color: '',
    label: 'Total Height',
  },
  {
    id: 'ID_TOTAL_FLAME_SEVERITY',
    color: '',
    label: 'Total Flame Severity',
  },
  {
    id: 'ID_TOTAL_CARBON',
    color: '',
    label: 'Total Carbon',
  },
];

@Component({
  selector: 'app-metric-filters',
  standalone: true,
  imports: [NgFor, MetricSelectorComponent, MetricSelectorComponent],
  templateUrl: './metric-filters.component.html',
  styleUrl: './metric-filters.component.scss',
})
export class MetricFiltersComponent implements OnInit {
  @Output() metricSelected = new EventEmitter<Metric>();

  initialOptions: Metric[] = METRICS;

  metricColors: string[] = ['#4361EE', '#9071E8', '#EC933A', '#63C2A2'];

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

  optionSelected(dropdownIndex: number, metric: Metric): void {
    // Storing the selection
    this.selectedOptions[dropdownIndex] = metric.id;

    // Updating the dropdowns
    this.updateDropdownOptions(dropdownIndex);
  }

  updateDropdownOptions(updatedDropdownIndex: number | null): void {
    // Updating every dropdown with the available options
    this.dropdownOptions = this.dropdownOptions.map(
      (list: Metric[], listIndex: number) => {
        // if the list is the same as the dropdown we are updating we want to keep it as it is
        if (listIndex === updatedDropdownIndex) {
          return this.applyMetricColor(listIndex, list);
        }

        // Keeping the selected option if the dropdown already have value and is not the updated dropdown
        const filteredList = this.initialOptions.filter(
          (m) =>
            !this.selectedOptions.includes(m.id) ||
            m.id === this.selectedOptions[listIndex]
        );

        return this.applyMetricColor(listIndex, filteredList);
      }
    );
  }

  applyMetricColor(dropdownIndex: number, list: Metric[]): Metric[] {
    return list.map((metric) => {
      metric.color = this.metricColors[dropdownIndex];
      return metric;
    });
  }

  activateMetric(metric: Metric): void {
    this.metricSelected.emit(metric);
  }
}

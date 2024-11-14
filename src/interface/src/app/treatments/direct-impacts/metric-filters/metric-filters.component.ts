import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MetricSelectorComponent } from './metric-selector/metric-selector.component';
import { NgFor } from '@angular/common';

export interface Metric {
  id: string;
  label: string;
}

export const METRICS: Metric[] = [
  {
    id: 'ID_CROWN_BULK_DENSITY',
    label: 'Crown Bulk Density',
  },
  {
    id: 'ID_CANOPY_BASE_HEIGHT',
    label: 'Canopy Base Height',
  },
  {
    id: 'ID_CANOPY_COVER',
    label: 'Canopy Cover',
  },
  {
    id: 'ID_LARGE_TREE_BIOMASS',
    label: 'Large Tree Biomass',
  },
  {
    id: 'ID_MERCHANTABLE_BIOMASS',
    label: 'Merchantable Biomass',
  },
  {
    id: 'ID_NON_MERCHANTABLE_BIOMASS',
    label: 'Non-Merchantable Biomass',
  },
  {
    id: 'ID_MORTALITY',
    label: 'Mortality',
  },
  {
    id: 'ID_POTENTIAL_SMOKE',
    label: 'Potential Smoke',
  },
  {
    id: 'ID_PROBABILITY_OF_TORCHING',
    label: 'Probability of Torching',
  },
  {
    id: 'ID_QUADRATIC_MEAN_DIAMETER',
    label: 'Quadratic Mean Diameter',
  },
  {
    id: 'ID_STAND_DENSITY_INDEX',
    label: 'Stand Density Index',
  },
  {
    id: 'ID_TOTAL_HEIGHT',
    label: 'Total Height',
  },
  {
    id: 'ID_TOTAL_FLAME_SEVERITY',
    label: 'Total Flame Severity',
  },
  {
    id: 'ID_TOTAL_CARBON',
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

  activateMetric(metric: Metric): void {
    this.metricSelected.emit(metric);
  }
}

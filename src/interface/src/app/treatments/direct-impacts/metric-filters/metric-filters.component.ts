import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MetricSelectorComponent } from './metric-selector/metric-selector.component';
import { NgFor } from '@angular/common';

export interface Metric {
  id: string;
  color: string;
  label: string;
  active: boolean;
}

export const METRICS: Metric[] = [
  {
    id: 'ID_CROWN_BULK_DENSITY',
    color: '#FF5733',
    label: 'Crown Bulk Density',
    active: false,
  },
  {
    id: 'ID_CANOPY_BASE_HEIGHT',
    color: '#33FF57',
    label: 'Canopy Base Height',
    active: false,
  },
  {
    id: 'ID_CANOPY_COVER',
    color: '#3357FF',
    label: 'Canopy Cover',
    active: false,
  },
  {
    id: 'ID_LARGE_TREE_BIOMASS',
    color: '#FF33A1',
    label: 'Large Tree Biomass',
    active: false,
  },
  {
    id: 'ID_MERCHANTABLE_BIOMASS',
    color: '#FFC300',
    label: 'Merchantable Biomass',
    active: false,
  },
  {
    id: 'ID_NON_MERCHANTABLE_BIOMASS',
    color: '#8E44AD',
    label: 'Non-Merchantable Biomass',
    active: false,
  },
  {
    id: 'ID_MORTALITY',
    color: '#16A085',
    label: 'Mortality',
    active: false,
  },
  {
    id: 'ID_POTENTIAL_SMOKE',
    color: '#E74C3C',
    label: 'Potential Smoke',
    active: false,
  },
  {
    id: 'ID_PROBABILITY_OF_TORCHING',
    color: '#3498DB',
    label: 'Probability of Torching',
    active: false,
  },
  {
    id: 'ID_QUADRATIC_MEAN_DIAMETER',
    color: '#F39C12',
    label: 'Quadratic Mean Diameter',
    active: false,
  },
  {
    id: 'ID_STAND_DENSITY_INDEX',
    color: '#9B59B6',
    label: 'Stand Density Index',
    active: false,
  },
  {
    id: 'ID_TOTAL_HEIGHT',
    color: '#2ECC71',
    label: 'Total Height',
    active: false,
  },
  {
    id: 'ID_TOTAL_FLAME_SEVERITY',
    color: '#E67E22',
    label: 'Total Flame Severity',
    active: false,
  },
  {
    id: 'ID_TOTAL_CARBON',
    color: '#1ABC9C',
    label: 'Total Carbon',
    active: false,
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
  @Output() metricActivated = new EventEmitter<any>();

  initialOptions: Metric[] = METRICS;

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

  optionSelected(dropdownIndex: number, metric: any): void {
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

  activateMetric(metric: any): void {
    this.metricActivated.emit(metric);
  }
}

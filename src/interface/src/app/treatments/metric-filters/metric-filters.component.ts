import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { AsyncPipe, NgFor, NgIf } from '@angular/common';

import { MetricSelectorComponent } from '../metric-selector/metric-selector.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import {
  MapMetric,
  MapMetricSlot,
  Metric,
  METRICS,
  SLOT_COLORS,
} from '../metrics';
import { FilterDropdownComponent } from 'src/styleguide';
import { TreatmentsState } from '../treatments.state';
import { filter, map, take } from 'rxjs/operators';
import { PRESCRIPTIONS, SequenceAttributes } from '../prescriptions';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-metric-filters',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgFor,
    MetricSelectorComponent,
    MetricSelectorComponent,
    FilterDropdownComponent,
  ],
  templateUrl: './metric-filters.component.html',
  styleUrl: './metric-filters.component.scss',
})
export class MetricFiltersComponent implements OnInit {
  @Output() metricSelected = new EventEmitter<MapMetric>();

  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentState: TreatmentsState
  ) {}

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

  treatmentTypeOptions$: Observable<any> = this.treatmentState.summary$.pipe(
    filter((summary) => summary !== null),
    take(1),
    map((summary) => {
      const options = [
        { category: 'Single Treatment', options: [] },
        { category: 'Sequenced Treatment', options: [] },
      ];

      if (!summary?.project_areas) {
        return options;
      }

      summary.project_areas.forEach((project_area) => {
        project_area.prescriptions.forEach((prescription) => {
          this.addTreatmentOption(
            prescription,
            options,
            PRESCRIPTIONS.SINGLE,
            PRESCRIPTIONS.SEQUENCE
          );
        });
      });
      return options;
    })
  );

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
    if (this.directImpactsStateService.isActiveSlot(slot)) {
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

  onConfirmedSelection(selection: any) {
    this.directImpactsStateService.setFilteredTreatmentTypes(
      selection.map((x: { key: string; value: string }): string => x.key)
    );
  }

  private addTreatmentOption(
    prescription: any,
    options: { category: string; options: any[] }[],
    singleActions: Record<string, string>,
    sequencedActions: Record<string, SequenceAttributes>
  ) {
    if (singleActions[prescription.action]) {
      options[0].options.push({
        key: prescription.action,
        value: singleActions[prescription.action],
      });
    } else if (sequencedActions[prescription.action]) {
      options[1].options.push(
        ...sequencedActions[prescription.action].details.map((x) => {
          return { key: prescription.action, value: x };
        })
      );
    }
  }
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { AsyncPipe, NgFor } from '@angular/common';

import { MetricSelectorComponent } from '../metric-selector/metric-selector.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import {
  ImpactsMetric,
  ImpactsMetricSlot,
  Metric,
  METRICS,
  SLOT_COLORS,
} from '../metrics';
import { FilterDropdownComponent } from 'src/styleguide';
import { TreatmentsState } from '../treatments.state';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { PRESCRIPTIONS } from '../../../app/treatments/prescriptions';

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
  @Output() metricUpdated = new EventEmitter<ImpactsMetric>();

  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentState: TreatmentsState
  ) {}

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

  treatmentTypeOptions$: Observable<any> = this.treatmentState.summary$.pipe(
    filter((summary) => summary !== null),
    take(1),
    map((summary) => {
      const initialValue = [
        { category: 'Single Treatment', options: [] },
        { category: 'Sequenced Treatment', options: [] },
      ];

      if (!summary?.project_areas) {
        return initialValue;
      }

      // Getting all prescriptions
      const prescriptions = summary.project_areas.flatMap((project_area) =>
        project_area.prescriptions.filter((prescription) => prescription)
      );

      const options = prescriptions.reduce(
        (acc: any, currentPrescription: any) => {
          if (currentPrescription.type === 'SINGLE') {
            if (
              !acc[0].options.some(
                (item: any) => item.action === currentPrescription.action
              )
            ) {
              acc[0].options.push({
                key: currentPrescription.action,
                value: (PRESCRIPTIONS.SINGLE as any)[
                  currentPrescription.action
                ],
              });
            }
          } else if (currentPrescription.type === 'SEQUENCE') {
            const prescriptionList: string[] = (PRESCRIPTIONS.SEQUENCE as any)[
              currentPrescription.action
            ].details;

            if (
              !acc[1].options.some(
                (item: any) => item.key === currentPrescription.action
              )
            ) {
              acc[1].options.push({
                key: currentPrescription.action,
                value: prescriptionList.join('\n'),
              });
            }
          }

          return acc;
        },
        initialValue
      );

      return options;
    })
  );

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
    // setting the metric as active if slot is active
    if (this.directImpactsStateService.isActiveSlot(slot)) {
      this.activateMetric(metric, slot);
    } else {
      this.metricUpdated.emit({ metric, slot });
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

  activateMetric(metric: Metric, slot: ImpactsMetricSlot): void {
    this.metricSelected.emit({ metric, slot });
  }

  onConfirmedSelection(selection: any) {
    this.directImpactsStateService.setFilteredTreatmentTypes(
      selection.map((x: { key: string; value: string }): string => x.key)
    );
  }
}

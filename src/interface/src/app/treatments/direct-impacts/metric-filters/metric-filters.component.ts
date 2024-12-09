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
import { DirectImpactsStateService } from '../../direct-impacts.state.service';
import { FilterDropdownComponent } from 'src/styleguide';
import { TreatmentsState } from '../../treatments.state';
import { PRESCRIPTIONS, SequenceAttributes } from '../../prescriptions';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-metric-filters',
  standalone: true,
  imports: [
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

  treatmentTypeOptions: { category: string; options: string[] }[] = [
    { category: 'Single Treatment', options: [] },
    { category: 'Sequenced Treatment', options: [] },
  ];

  ngOnInit(): void {
    // Updating every list based on the default selected values
    this.updateDropdownOptions(null);
    // Getting the treatment types
    this.getTreatmentTypes();
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
    if (this.directImpactsStateService.activeMetric$.value.slot === slot) {
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

  getTreatmentTypes() {
    const options = [
      { category: 'Single Treatment', options: [] },
      { category: 'Sequenced Treatment', options: [] },
    ];

    this.treatmentState.summary$
      .pipe(
        filter((summary) => summary !== null),
        take(1)
      )
      .subscribe((summary) => {
        if (!summary?.project_areas) {
          this.treatmentTypeOptions = options;
          return;
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

        this.treatmentTypeOptions = options;
      });
  }

  onConfirmedSelection(selection: any) {
    this.directImpactsStateService.filteredTreatmentTypes$.next(
      this.processTreatmentTypeSelection(selection)
    );
  }

  private addTreatmentOption(
    prescription: any,
    options: { category: string; options: any[] }[],
    singleActions: Record<string, string>,
    sequencedActions: Record<string, SequenceAttributes>
  ) {
    if (singleActions[prescription.action]) {
      options[0].options.push(singleActions[prescription.action]);
    } else if (sequencedActions[prescription.action]) {
      options[1].options.push(...sequencedActions[prescription.action].details);
    }
  }

  processTreatmentTypeSelection(selection: string[]): string[] {
    if (!selection || selection.length === 0) {
      return [];
    }

    const findSingleKey = (option: string): string | undefined => {
      return Object.entries(PRESCRIPTIONS.SINGLE).find(
        ([_, value]) => value === option
      )?.[0];
    };

    const findSequencedKey = (option: string): string | undefined => {
      return Object.entries(PRESCRIPTIONS.SEQUENCE).find(([_, attributes]) =>
        attributes.details.includes(option)
      )?.[0];
    };

    const result = selection
      .map((option) => findSingleKey(option) || findSequencedKey(option))
      .filter((key): key is string => !!key);
    return result;
  }
}

import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
//TODO: fix path?
import { OpacitySliderComponent } from '../../../styleguide/opacity-slider/opacity-slider.component';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';
import { TreatmentExpanderComponent } from 'src/styleguide/treatment-expander/treatment-expander.component';
import { MatIconModule } from '@angular/material/icon';
import { PrescriptionSingleAction } from '../prescriptions';
import { InputDirective } from '../../../styleguide/input/input.directive';
import { InputFieldComponent } from '../../../styleguide/input/input-field.component';

// TODO: Does this Type exist somewhere else?
export type TreatmentRecord = {
  rxDetails?: any[]; // TODO: should establish this as a type?
  treatmentType?: PrescriptionSingleAction;
  sequenceNumber?: number;
  title?: string;
  standCount?: string | number;
};

const exampleTreatments: TreatmentRecord[] = [
  {
    treatmentType: 'HEAVY_THINNING_BURN',
    standCount: 11,
  },
  {
    standCount: 11,
    treatmentType: 'MODERATE_THINNING_BURN',
  },
  {
    standCount: '11/200',
    sequenceNumber: 1,
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
  },
  {
    standCount: '11/200',
    sequenceNumber: 2,
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
  },
  {
    sequenceNumber: 3,
    standCount: '11/200',
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
  },
  {
    sequenceNumber: 4,
    standCount: '8/200',
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
  },
];

@Component({
  selector: 'app-treatments-tab',
  standalone: true,
  imports: [
    InputDirective,
    InputFieldComponent,
    MatIconModule,
    NgIf,
    NgFor,
    OpacitySliderComponent,
    SearchBarComponent,
    TreatmentExpanderComponent,
  ],
  templateUrl: './treatments-tab.component.html',
  styleUrl: './treatments-tab.component.scss',
})
export class TreatmentsTabComponent {
  @Input() treatments = exampleTreatments;

  hasTreatments() {
    return this.treatments.length > 0;
  }

  // TODO: what does this data shape really look like?
  // what daunting type mapping has to happen?
  loadTreatments() {}
}

import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
//TODO: fix path?
import { OpacitySliderComponent } from '../../../styleguide/opacity-slider/opacity-slider.component';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';
import { TreatmentExpanderComponent } from 'src/styleguide/treatment-expander/treatment-expander.component';
import { MatIconModule } from '@angular/material/icon';
import { InputDirective } from '../../../styleguide/input/input.directive';
import { InputFieldComponent } from '../../../styleguide/input/input-field.component';
import { Prescription } from '@types';
import { PRESCRIPTIONS, PrescriptionSingleAction } from '../prescriptions';

// TODO: remove
const examplePrescriptions: Prescription[] = [
  {
    action: 'HEAVY_THINNING_BURN',
    type: 'SINGLE',
    area_acres: 12000,
    treated_stand_count: 34,
    stand_ids: [],
  },
  {
    action: 'MODERATE_THINNING_BURN',
    type: 'SINGLE',
    area_acres: 30,
    treated_stand_count: 18,
    stand_ids: [],
  },
  {
    action: 'HEAVY_THINNING_BIOMASS',
    type: 'SINGLE',
    area_acres: 110,
    treated_stand_count: 15,
    stand_ids: [],
  },
  {
    action: 'HEAVY_THINNING_RX_FIRE',
    type: 'SINGLE',
    area_acres: 0,
    treated_stand_count: 265,
    stand_ids: [],
  },
  {
    action: 'MASTICATION_RX_FIRE',
    type: 'SINGLE',
    area_acres: 86,
    treated_stand_count: 1111,
    stand_ids: [1, 2, 4, 5],
  },
];

@Component({
  selector: 'app-project-area-tx-tab',
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
export class ProjectAreaTreatmentsTabComponent {
  @Input() treatments: Prescription[] = examplePrescriptions;
  layerOpacity: number = 100; // TODO: raise this up to state?
  searchString: string = '';

  hasTreatments() {
    return this.treatments.length > 0;
  }

  handleOpacityChange(opacity: number) {
    this.layerOpacity = opacity;
  }

  // TODO: only do this if an angular filter isn't an option
  displayedTreatments(): Prescription[] {
    const needle = this.searchString.toLowerCase();
    return this.treatments.filter(
      (p) =>
        p.action.toLowerCase().includes(needle) ||
        PRESCRIPTIONS.SINGLE[p.action as PrescriptionSingleAction].includes(
          needle
        )
    );
  }

  setSearchString(searchString: string) {
    this.searchString = searchString;
  }

  // TODO: what does this data shape really look like?
  // what daunting type mapping has to happen?
  loadTreatments() {
    // this.treatments =
  }
}

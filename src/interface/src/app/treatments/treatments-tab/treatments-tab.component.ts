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

const exampleSummary = {
  project_area_id: 1,
  project_area_name: 'Project Area 1',
  total_stand_count: 20,
  prescriptions: [
    {
      action: 'MODERATE_THINNING_BIOMASS',
      area_acres: 100,
      treated_stand_count: 3,
      type: 'SINGLE',
      stand_ids: [1, 2, 3, 8, 10],
    },
    {
      action: 'HEAVY_THINNING_BIOMASS',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SINGLE',
      stand_ids: [4, 5],
    },
    {
      action: 'HEAVY_MASTICATION',
      area_acres: 50,
      treated_stand_count: 1,
      type: 'SINGLE',
      stand_ids: [4, 5],
    },
    {
      action: 'MASTICATION_RX_FIRE',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SINGLE',
      stand_ids: [4, 5],
    },
    {
      action: 'HEAVY_THINNING_BURN',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SINGLE',
      stand_ids: [4, 5],
    },
    {
      action: 'RX_FIRE_PLUS_RX_FIRE',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SEQUENCE',
      stand_ids: [4, 5],
    },
    {
      action: 'MODERATE_MASTICATION_PLUS_RX_FIRE',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SEQUENCE',
      stand_ids: [4, 5],
    },
    {
      action: 'HEAVY_THINNING_BURN_PLUS_RX_FIRE',
      area_acres: 50,
      treated_stand_count: 2,
      type: 'SEQUENCE',
      stand_ids: [4, 5],
    },
  ],
  extent: [],
  centroid: {},
};

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
  //TODO: either get this from template input or directly from state?
  @Input() prescriptions: Prescription[] = exampleSummary.prescriptions;

  layerOpacity: number = 100;
  searchString: string = '';

  hasTreatments() {
    return this.prescriptions.length > 0;
  }

  handleOpacityChange(opacity: number) {
    this.layerOpacity = opacity;
  }

  displayedTreatments(): Prescription[] {
    const needle = this.searchString.toLowerCase();
    //handle text searches
    return this.prescriptions.filter(
      (p) =>
        p.action.toLowerCase().includes(needle) ||
        (p.type === 'SINGLE' &&
          PRESCRIPTIONS.SINGLE[p.action as PrescriptionSingleAction]
            .toLowerCase()
            .includes(needle))
    );
  }

  setSearchString(searchString: string) {
    this.searchString = searchString;
  }
}

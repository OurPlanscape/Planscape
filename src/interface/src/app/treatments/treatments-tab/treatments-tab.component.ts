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

// TODO: Does this Type exist somewhere else?

/*
example response from summary...

  "planning_area_id": 0,
  "planning_area_name": "string",
  "scenario_id": 0,
  "scenario_name": "string",
  "treatment_plan_id": 0,
  "treatment_plan_name": "string",
  "project_areas": [
    {
      "project_area_id": 0,
      "project_area_name": "string",
      "total_stand_count": 0,
      "prescriptions": [
        {
          "action": "string",
          "type": "string",
          "area_acres": 0,
          "treated_stand_count": 0
        }
      ]
    }
  ]
}
*/

const examplePrescriptions: Prescription[] = [
  {
    action: 'HEAVY_THINNING_BURN',
    type: 'SINGLE',
    area_acres: 12000,
    treated_stand_count: 0,
    stand_ids: [],
  },
  {
    action: 'MODERATE_THINNING_BURN',
    type: 'SINGLE',
    area_acres: 30,
    treated_stand_count: 0,
    stand_ids: [],
  },
  {
    action: '',
    type: 'SINGLE',
    area_acres: 0,
    treated_stand_count: 0,
    stand_ids: [],
  },
  {
    action: '',
    type: 'SINGLE',
    area_acres: 0,
    treated_stand_count: 0,
    stand_ids: [],
  },
  {
    action: '',
    type: 'SINGLE',
    area_acres: 0,
    treated_stand_count: 0,
    stand_ids: [],
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
  @Input() treatments = examplePrescriptions;
  layerOpacity: number = 100; // TODO: raise this up to state?

  hasTreatments() {
    return this.treatments.length > 0;
  }

  handleOpacityChange(opacity: number) {
    this.layerOpacity = opacity;
  }

  // TODO: what does this data shape really look like?
  // what daunting type mapping has to happen?
  loadTreatments() {
    // this.treatments =
  }
}

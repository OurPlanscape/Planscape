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
  @Input() prescriptions: Prescription[] = [];
  layerOpacity: number = 100; // TODO: get this from state?
  searchString: string = '';

  hasTreatments() {
    return this.prescriptions.length > 0;
  }

  handleOpacityChange(opacity: number) {
    this.layerOpacity = opacity;
  }

  // TODO: only do this if an angular filter isn't an option
  displayedTreatments(): Prescription[] {
    const needle = this.searchString.toLowerCase();
    return this.prescriptions.filter(
      (p) =>
        p.action.toLowerCase().includes(needle) ||
        PRESCRIPTIONS.SINGLE[p.action as PrescriptionSingleAction]
          .toLowerCase()
          .includes(needle)
    );
  }

  setSearchString(searchString: string) {
    this.searchString = searchString;
  }
}

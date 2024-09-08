import { Component } from '@angular/core';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { AsyncPipe, NgForOf } from '@angular/common';
import { MapConfigState } from '../treatment-map/map-config.state';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [NgForOf, AsyncPipe],
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
})
export class MapControlsComponent {
  boxSelectionEnabled$ = this.mapConfigState.boxSelectionEnabled$;

  constructor(
    private selectedStandsState: SelectedStandsState,
    private mapConfigState: MapConfigState
  ) {}

  clearTreatments() {
    this.selectedStandsState.clearStands();
  }

  toggleMapDrag() {
    this.mapConfigState.toggleBoxSelectionEnabled();
  }

  toggleShowStands() {
    this.mapConfigState.toggleShowTreatmentStands();
  }
}

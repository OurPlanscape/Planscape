import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { NgForOf } from '@angular/common';
import { MapConfigState } from '../treatment-map/map-config.state';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [NgForOf],
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
})
export class MapControlsComponent {
  // placeholder for map controls

  @Input() mapDragging = false;
  @Output() toggleDrag = new EventEmitter<boolean>();

  constructor(
    private selectedStandsState: SelectedStandsState,
    private mapConfigState: MapConfigState
  ) {}

  clearTreatments() {
    this.selectedStandsState.clearStands();
  }

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
    this.toggleDrag.emit(this.mapDragging);
  }

  toggleShowStands() {
    this.mapConfigState.toggleShowTreatmentStands();
  }
}

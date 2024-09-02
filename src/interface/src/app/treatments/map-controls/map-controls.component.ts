import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { NgForOf } from '@angular/common';

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

  constructor(private selectedStandsState: SelectedStandsState) {}

  clearTreatments() {
    this.selectedStandsState.clearStands();
  }

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
    this.toggleDrag.emit(this.mapDragging);
  }
}

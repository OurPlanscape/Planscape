import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [],
  templateUrl: './map-controls.component.html',
  styleUrl: './map-controls.component.scss',
})
export class MapControlsComponent {
  // placeholder for map controls

  @Input() mapDragging = false;
  @Output() toggleDrag = new EventEmitter<boolean>();

  constructor(private mapStandsService: SelectedStandsState) {}

  clearTreatments() {
    this.mapStandsService.clearStands();
  }

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
    this.toggleDrag.emit(this.mapDragging);
  }
}

import { Component, Input } from '@angular/core';
import { JsonPipe, NgForOf } from '@angular/common';
import {
  DraggableDirective,
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

import { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { SelectedStandsState } from './selected-stands.state';

// possible assignment for  a stand.
export type StandAssigment =
  | 'selected'
  | 'treatment-1'
  | 'treatment-2'
  | 'treatment-3';

export const StandColors: Record<StandAssigment, string> = {
  selected: '#0066ff',
  'treatment-1': '#f8f802',
  'treatment-2': '#d27601',
  'treatment-3': '#ee0d0d',
};

@Component({
  selector: 'app-treatment-map',
  standalone: true,
  imports: [
    JsonPipe,
    NgForOf,
    MapComponent,
    VectorSourceComponent,
    LayerComponent,
    FeatureComponent,
    DraggableDirective,
    GeoJSONSourceComponent,
    MapStandsComponent,
    MapRectangleComponent,
  ],
  providers: [SelectedStandsState],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  types: StandAssigment = 'selected';
  maplibreMap!: MapLibreMap;
  key = '52395617-45bd-4500-87d4-2159a35e3dcf';

  // ew, not sure if I want to do prop drilling here or set up something else (provider?)
  @Input() projectAreaId: number | null = null;
  @Input() treatmentPlanId = 0;

  treatedStands: { id: number; assigment: StandAssigment }[] = [];

  mapDragging = true;

  private isDragging = false;
  start: MapMouseEvent | null = null;
  end: MapMouseEvent | null = null;

  constructor(private mapStandsService: SelectedStandsState) {}

  // -----------------------------------------------------------------
  // Map events
  // -----------------------------------------------------------------

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    this.isDragging = true;
    this.start = event;
    this.maplibreMap.getCanvas().style.cursor = 'crosshair';
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.end = event;
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.maplibreMap.getCanvas().style.cursor = '';
    this.start = null;
    this.end = null;
  }

  // -----------------------------------------------------------------
  // Page demo actions
  // -----------------------------------------------------------------

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
  }

  assignTreatment(treatment: StandAssigment) {
    const selectedStands: number[] = this.mapStandsService.getSelectedStands();
    this.treatedStands = [
      ...this.treatedStands.filter(
        (treatment) => !selectedStands.includes(treatment.id)
      ),
      ...selectedStands.map((id) => ({
        id: id,
        assigment: treatment,
      })),
    ];
    this.mapStandsService.clearStands();
  }

  clearTreatments() {
    this.mapStandsService.clearStands();
    this.treatedStands = [];
  }
}

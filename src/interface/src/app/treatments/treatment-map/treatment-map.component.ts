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
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { environment } from '../../../environments/environment';

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
    MapControlsComponent,
  ],
  providers: [SelectedStandsState],
  templateUrl: './treatment-map.component.html',
  styleUrl: './treatment-map.component.scss',
})
export class TreatmentMapComponent {
  mapLibreMap!: MapLibreMap;
  readonly key = environment.stadiamaps_key;

  // TODO: should we keep using prop drilling here? Consider using a provider service to hold these values
  @Input() projectAreaId: number | null = null;
  @Input() treatmentPlanId = 0;

  treatedStands: { id: number; assigment: string }[] = [];

  mapDragging = true;

  private isDragging = false;
  start: MapMouseEvent | null = null;
  end: MapMouseEvent | null = null;

  constructor() {}

  onMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button === 2) {
      return;
    }
    if (this.mapDragging) {
      return;
    }
    this.isDragging = true;

    this.start = event;
    this.mapLibreMap.getCanvas().style.cursor = 'crosshair';
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.end = event;
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.start = null;
    this.end = null;
  }
}
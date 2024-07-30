import { Component, OnInit } from '@angular/core';
import { JsonPipe, NgForOf } from '@angular/common';
import { PlanService } from '@services';
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
import { MapStandsService } from '../map-stands/map-stands.service';

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
  selector: 'app-project-area',
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
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  types: StandAssigment = 'selected';
  maplibreMap!: MapLibreMap;
  key = '52395617-45bd-4500-87d4-2159a35e3dcf';

  projectAreaId = 2710;

  treatedStands: { id: number; assigment: StandAssigment }[] = [];

  mapDragging = false;

  private isDragging = false;
  start: MapMouseEvent | null = null;
  end: MapMouseEvent | null = null;

  constructor(
    private planService: PlanService,
    private mapStandsService: MapStandsService
  ) {}

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  // -----------------------------------------------------------------
  // Map events, used for drawing the rectangle.
  // -----------------------------------------------------------------

  onMapMouseDown(event: MapMouseEvent): void {
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

  // assigning treatment
  assignTreatment(treatment: StandAssigment) {
    const selectedStands: number[] =
      this.mapStandsService.selectedStands$.value;
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

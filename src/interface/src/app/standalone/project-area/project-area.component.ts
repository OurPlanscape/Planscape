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

import { LngLat, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';

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

  selectedStands: number[] = [];
  private initialSelectedStands: number[] = [];

  treatedStands: { id: number; assigment: StandAssigment }[] = [];

  mapDragging = false;

  private isDragging = false;
  private start: MapMouseEvent | null = null;
  private end: MapMouseEvent | null = null;

  public selectStart: LngLat | null = null;
  public selectEnd: LngLat | null = null;

  constructor(private planService: PlanService) {}

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  clickOnStand(standId: any) {
    this.toggleStands(standId);
  }

  private toggleStands(id: number) {
    const selectedStand = this.selectedStands.find((standId) => standId === id);
    if (selectedStand) {
      this.selectedStands = this.selectedStands.filter(
        (selectedStandId) => selectedStandId !== id
      );
    } else {
      this.selectedStands = [...this.selectedStands, id];
    }
  }

  // -----------------------------------------------------------------
  // Map events, used for drawing the rectangle.
  // -----------------------------------------------------------------

  onMapMouseDown(event: MapMouseEvent): void {
    this.isDragging = true;
    this.start = event;
    this.maplibreMap.getCanvas().style.cursor = 'crosshair';
    this.initialSelectedStands = [...this.selectedStands];
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.end = event;
    this.updateRectangleSource();
    this.selectStandsWithinRectangle();
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.maplibreMap.getCanvas().style.cursor = '';
    this.start = null;
    this.end = null;
    this.clearRectangle();
  }

  // -----------------------------------------------------------------
  // Drawing rectangle on page
  // -----------------------------------------------------------------

  updateRectangleSource(): void {
    if (!this.start || !this.end) {
      return;
    }
    this.selectStart = this.start.lngLat;
    this.selectEnd = this.end.lngLat;
  }

  clearRectangle(): void {
    this.selectStart = null;
    this.selectEnd = null;
    //  this.updateRectangleGeometry([[]]);
  }

  selectStandsWithinRectangle(): void {
    if (!this.start || !this.end) {
      return;
    }
    const start = [this.start.point.x, this.start.point.y];
    const end = [this.end.point.x, this.end.point.y];

    const bbox: [[number, number], [number, number]] = [
      [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
      [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
    ];
    const features = this.maplibreMap.queryRenderedFeatures(bbox, {
      layers: ['stands-layer'],
    });

    // this.initialSelectedStands are the stands I have selected before starting the mouse events.
    // I need to calculate this.selectedStands by adding all the features that landed on the query

    const newStands: number[] = [];
    let id: any;
    features.forEach((feature) => {
      id = feature.properties['id'];
      const stand = this.initialSelectedStands.find((sId) => sId === id);
      if (stand) {
      } else {
        newStands.push(id);
      }
    });

    const combinedStands = new Set([
      ...this.initialSelectedStands,
      ...newStands,
    ]);
    this.selectedStands = Array.from(combinedStands);
  }

  // -----------------------------------------------------------------
  // Page demo actions
  // -----------------------------------------------------------------

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
  }

  // assigning treatment
  assignTreatment(treatment: StandAssigment) {
    this.treatedStands = [
      ...this.treatedStands.filter(
        (treatment) => !this.selectedStands.includes(treatment.id)
      ),
      ...this.selectedStands.map((id) => ({
        id: id,
        assigment: treatment,
      })),
    ];
    this.selectedStands = [];
  }

  clearTreatments() {
    this.selectedStands = [];
    this.treatedStands = [];
  }
}

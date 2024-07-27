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

import {
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { Polygon } from 'geojson';

// possible assignment for  a stand.
export type StandAssigment = 'selected' | 'treatment-1' | 'treatment-2';

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
  mapDragging = false;

  rectangleGeometry: Polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  private isDragging = false;
  private start: [number, number] | null = null;
  private end: [number, number] | null = null;

  constructor(private planService: PlanService) {}

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  get paint(): LayerSpecification['paint'] {
    return {
      'fill-color': [
        'case',
        [
          'boolean',
          ['in', ['get', 'id'], ['literal', this.selectedStands]],
          false,
        ],
        '#FF0000', // Color for selected stands
        '#00FF00', // Color for non-selected stands
      ],
      'fill-opacity': 0.5,
    };
  }

  clickOnStand(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
    });

    const standId = features[0].properties['id'];
    this.toggleStands(standId);
  }

  private toggleStands(id: number) {
    if (this.selectedStands.includes(id)) {
      this.selectedStands = this.selectedStands.filter(
        (standId) => standId !== id
      );
    } else {
      this.selectedStands = [...this.selectedStands, id];
    }
  }

  // -----------------------------------------------------------------
  // Map events, used for drawing the rectangle.
  // -----------------------------------------------------------------

  onMapMouseDown(event: any): void {
    this.isDragging = true;
    this.start = [event.lngLat.lng, event.lngLat.lat];
    this.maplibreMap.getCanvas().style.cursor = 'crosshair';
  }

  onMapMouseMove(event: any): void {
    if (!this.isDragging) return;
    this.end = [event.lngLat.lng, event.lngLat.lat];
    this.updateRectangleSource(this.start!, this.end);
  }

  onMapMouseUp(event: any): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.maplibreMap.getCanvas().style.cursor = '';

    this.end = [event.lngLat.lng, event.lngLat.lat];
    if (this.start && this.end) {
      this.selectStandsWithinRectangle(this.start, this.end);
    }

    this.start = null;
    this.end = null;
    this.clearRectangle();
  }

  // -----------------------------------------------------------------
  // Drawing rectangle on page
  // -----------------------------------------------------------------

  updateRectangleSource(start: [number, number], end: [number, number]): void {
    this.updateRectangleGeometry([
      [start, [start[0], end[1]], end, [end[0], start[1]], start],
    ]);
  }

  clearRectangle(): void {
    this.updateRectangleGeometry([[]]);
  }

  // todo maybe I can use a get() here and avoid this.
  private updateRectangleGeometry(cords: number[][][]) {
    this.rectangleGeometry.coordinates = cords;
    (this.maplibreMap.getSource('rectangle-source') as GeoJSONSource)?.setData(
      this.rectangleGeometry
    );
  }

  selectStandsWithinRectangle(
    start: [number, number],
    end: [number, number]
  ): void {
    const bbox: [[number, number], [number, number]] = [
      [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
      [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
    ];
    const features = this.maplibreMap.queryRenderedFeatures(bbox, {
      layers: ['stands-layer'],
    });

    const selectedIds = features.map((feature) => feature.properties['id']);
    this.selectedStands = Array.from(
      new Set([...this.selectedStands, ...selectedIds])
    );
  }

  // -----------------------------------------------------------------
  // Page demo actions
  // -----------------------------------------------------------------

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
  }

  // assigning treatment
  assignTreatment1() {
    console.log(this.selectedStands, 'treatment 1');
  }

  assignTreatment2() {
    console.log(this.selectedStands, 'treatment 2');
  }
}

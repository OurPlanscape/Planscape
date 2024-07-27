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
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { Polygon } from 'geojson';

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
  maplibreMap!: MapLibreMap;
  key = '52395617-45bd-4500-87d4-2159a35e3dcf';

  projectAreaId = 2710;

  selectedStands: number[] = [];
  mapDragging = false;

  rectangleGeometry: Polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  mapFilter: FilterSpecification = [
    'in',
    ['get', 'id'],
    ['literal', this.selectedStands],
  ];

  private isDragging = false;
  private start: [number, number] | null = null;
  private end: [number, number] | null = null;

  constructor(private planService: PlanService) {}

  log(...a: any) {
    console.log(a);
  }

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
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

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
  }

  clickLayer(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
    });

    const standId = features[0].properties['id'];
    this.toggleStands(standId);
    this.updateMapFilter();
  }

  updateMapFilter(): void {
    this.mapFilter = ['in', ['get', 'id'], ['literal', this.selectedStands]];
  }

  ///

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

  updateRectangleSource(start: [number, number], end: [number, number]): void {
    this.updateRectangleGeometry([
      [start, [start[0], end[1]], end, [end[0], start[1]], start],
    ]);
  }

  clearRectangle(): void {
    this.updateRectangleGeometry([[]]);
  }

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

  onDragStart(e: any) {
    console.log(e);
  }

  onDragEnd(e: any) {
    console.log(e);
  }

  onDrag(e: any) {
    console.log(e);
  }
}

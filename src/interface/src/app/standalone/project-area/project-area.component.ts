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
  MapMouseEvent,
} from 'maplibre-gl';
import { Polygon } from 'geojson';

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
  ],
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  types: StandAssigment = 'selected';
  maplibreMap!: MapLibreMap;
  key = '52395617-45bd-4500-87d4-2159a35e3dcf';

  projectAreaId = 2710;

  selectedStands: { id: number; assigment: StandAssigment }[] = [];
  mapDragging = false;

  rectangleGeometry: Polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  private isDragging = false;
  private start: MapMouseEvent | null = null;
  private end: MapMouseEvent | null = null;

  constructor(private planService: PlanService) {}

  ngOnInit() {
    this.planService.getProjectAreas(2710).subscribe((r) => console.log(r));
  }

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  get paint(): LayerSpecification['paint'] {
    return {
      'fill-outline-color': '#000',
      'fill-color': this.getFillColors() as any,
      'fill-opacity': 0.5,
    };
  }

  someIds = [1344190, 1344988];

  getFillColors() {
    const matchExpression: (string | string[] | number)[] = [];
    matchExpression.push('match');
    matchExpression.push(['get', 'id']);
    matchExpression.push(0);
    matchExpression.push('#00a000');
    matchExpression.push(1);
    matchExpression.push('#00a000');

    this.selectedStands.forEach((stand) => {
      matchExpression.push(stand.id);
      matchExpression.push(StandColors[stand.assigment]);
    });
    matchExpression.push('#00000050');
    return matchExpression;
  }

  get selectedIds() {
    return this.selectedStands.map((stand) => stand.id);
  }

  clickOnStand(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
    });

    const standId = features[0].properties['id'];
    this.toggleStands(standId);
  }

  private toggleStands(id: number) {
    const selectedStand = this.selectedStands.find((stand) => stand.id === id);
    if (selectedStand) {
      this.selectedStands = this.selectedStands.filter(
        (stand) => stand.id !== id
      );
      if (selectedStand.assigment !== 'selected') {
        this.selectedStands = [
          ...this.selectedStands,
          { id, assigment: 'selected' },
        ];
      }
    } else {
      this.selectedStands = [
        ...this.selectedStands,
        { id, assigment: 'selected' },
      ];
    }
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
    this.updateRectangleSource();
    this.selectStandsWithinRectangle();
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.maplibreMap.getCanvas().style.cursor = '';

    this.end = event;

    this.selectStandsWithinRectangle();

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
    const start = [this.start.lngLat.lng, this.start.lngLat.lat];
    const end = [this.end.lngLat.lng, this.end.lngLat.lat];
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

    const selectedIds = features.map((feature) => feature.properties['id']);
    console.log(selectedIds);

    selectedIds.forEach((id: number) => {
      // if I dont have it add it
      // if I have it mark as selected

      const stand = this.selectedStands.find((s) => s.id === id);
      if (stand) {
      } else {
        this.selectedStands = [
          ...this.selectedStands,
          { id: id, assigment: 'selected' },
        ];
      }
    });

    // this.selectedStands = Array.from(
    //   new Set([...this.selectedStands, ...selectedIds])
    // );
  }

  // -----------------------------------------------------------------
  // Page demo actions
  // -----------------------------------------------------------------

  toggleMapDrag() {
    this.mapDragging = !this.mapDragging;
  }

  // assigning treatment
  assignTreatment(treatment: StandAssigment) {
    console.log(this.selectedStands, 'treatment 1');

    this.selectedStands = this.selectedStands.map((stand) => ({
      id: stand.id,
      assigment: stand.assigment === 'selected' ? treatment : stand.assigment,
    }));
  }

  clearTreatments() {
    this.selectedStands = this.selectedStands.filter(
      (stand) => stand.assigment != 'selected'
    );
  }
}

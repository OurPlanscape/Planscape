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

  initialSelectedStands: { id: number; assigment: StandAssigment }[] = [];

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

  // todo maybe this needs to be a static prop and not a get
  // and manually handle when to update this.
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
    // TODO
    // save initialSelectedStands
    this.initialSelectedStands = [...this.selectedStands];
  }

  onMapMouseMove(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.end = event;
    this.updateRectangleSource();
    this.selectStandsWithinRectangle();
    // TODO - while mouse is moving, check only update the stands
    // that are NOW selected, meaning always compare against initialSelectedStands
  }

  onMapMouseUp(event: MapMouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.maplibreMap.getCanvas().style.cursor = '';
    this.start = null;
    this.end = null;
    // TODO "commit" the selected stands.
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

    // this.initialSelectedStands are the stands I have selected before starting the mouse events.
    // I need to calculate this.selectedStands by adding all the features that landed on the query
    const newStands: { id: number; assigment: StandAssigment }[] = [];

    let id: any;
    features.forEach((feature) => {
      id = feature.properties['id'];
      const stand = this.initialSelectedStands.find((s) => s.id === id);
      if (stand) {
      } else {
        // this.selectedStands = [
        //   ...this.initialSelectedStands,
        //   { id: id, assigment: 'selected' },
        // ];
        newStands.push({ id: id, assigment: 'selected' });
      }
    });

    this.selectedStands = [...this.initialSelectedStands, ...newStands];
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

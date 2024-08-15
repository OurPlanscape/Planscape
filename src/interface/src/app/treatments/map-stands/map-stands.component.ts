import { Component, Input, SimpleChanges } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';

import { AsyncPipe } from '@angular/common';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';

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
  selector: 'app-map-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent, AsyncPipe],
  templateUrl: './map-stands.component.html',
})
export class MapStandsComponent {
  @Input() projectAreaId: number | null = null;
  @Input() treatmentPlanId = 0;
  @Input() maplibreMap!: MapLibreMap;
  @Input() selectStart!: Point | null;
  @Input() selectEnd!: Point | null;

  selectedStands$ = this.mapStandsService.selectedStands$;
  private initialSelectedStands: number[] = [];

  // todo figure out host thing
  readonly tilesUrl =
    'http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}';

  @Input() treatedStands: { id: number; assigment: StandAssigment }[] = [];

  readonly layers = {
    outline: 'outline-layer',
    stands: 'stands-layer',
    selectedStands: 'stands-layer-selected',
  };

  constructor(private mapStandsService: SelectedStandsState) {}

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=2710`;
    // return (
    //   this.tilesUrl +
    //   `?treatment_plan_id=${this.treatmentPlanId}${
    //     this.projectAreaId ? `&project_area_id=${this.projectAreaId}` : ''
    //   }`
    // );
  }

  private updateSelectedStands(selectedStands: number[]) {
    this.mapStandsService.updateSelectedStands(selectedStands);
  }

  clickOnLayer(event: MapMouseEvent) {
    if (event.originalEvent.button === 2) {
      return;
    }

    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: [this.layers.stands],
    });

    const standId = features[0].properties['id'];
    this.mapStandsService.toggleStand(standId);
  }

  // update and change only when needed.
  paint: LayerSpecification['paint'] = {
    'fill-outline-color': '#000',
    'fill-color': this.getFillColors() as any,
    'fill-opacity': 0.5,
  };

  getFillColors() {
    const defaultColor = '#00000050';
    if (this.treatedStands.length === 0) {
      return defaultColor;
    }
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'id'],
    ];

    this.treatedStands.forEach((stand) => {
      matchExpression.push(stand.id, StandColors[stand.assigment]);
    });
    matchExpression.push(defaultColor);

    return matchExpression;
  }

  selectStandsWithinRectangle(): void {
    if (!this.selectStart || !this.selectEnd) {
      this.initialSelectedStands = [
        ...this.mapStandsService.getSelectedStands(),
      ];
      return;
    }

    const bbox = this.getBoundingBox(this.selectStart, this.selectEnd);
    const features = this.maplibreMap.queryRenderedFeatures(bbox, {
      layers: [this.layers.stands],
    });

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

    this.updateSelectedStands(Array.from(combinedStands));
  }

  private getBoundingBox(
    startPoint: Point,
    endPoint: Point
  ): [[number, number], [number, number]] {
    const start = [startPoint.x, startPoint.y];
    const end = [endPoint.x, endPoint.y];
    return [
      [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
      [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
    ];
  }

  ngOnChanges(changes: SimpleChanges) {
    // update map colors when the treatedStands change
    if (changes['treatedStands']) {
      // update map filter
      this.paint = {
        'fill-outline-color': '#000',
        'fill-color': this.getFillColors() as any,
        'fill-opacity': 0.5,
      };
    }
    // finds selected stands when the select bounding box changes
    if (changes['selectStart'] || changes['selectEnd']) {
      //select stands
      this.selectStandsWithinRectangle();
    }
  }
}

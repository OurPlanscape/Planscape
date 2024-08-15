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
import { getBoundingBox } from '../maplibre.helper';

@Component({
  selector: 'app-map-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent, AsyncPipe],
  templateUrl: './map-stands.component.html',
})
export class MapStandsComponent {
  @Input() treatmentPlanId = 0;
  @Input() projectAreaId: number | null = null;
  @Input() mapLibreMap!: MapLibreMap;
  @Input() selectStart!: Point | null;
  @Input() selectEnd!: Point | null;
  @Input() treatedStands: { id: number; assigment: string }[] = [];

  selectedStands$ = this.mapStandsService.selectedStands$;
  private initialSelectedStands: number[] = [];

  // todo figure out host thing
  readonly tilesUrl =
    'http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}';

  readonly layers = {
    outline: 'outline-layer',
    stands: 'stands-layer',
    selectedStands: 'stands-layer-selected',
  };

  constructor(private mapStandsService: SelectedStandsState) {}

  get vectorLayerUrl() {
    //return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=2710`;
    return (
      this.tilesUrl +
      `?treatment_plan_id=${this.treatmentPlanId}${
        this.projectAreaId ? `&project_area_id=${this.projectAreaId}` : ''
      }`
    );
  }

  private updateSelectedStands(selectedStands: number[]) {
    this.mapStandsService.updateSelectedStands(selectedStands);
  }

  clickOnLayer(event: MapMouseEvent) {
    // do not react to right clicks
    if (event.originalEvent.button === 2) {
      return;
    }

    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
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
      matchExpression.push(stand.id, '#ff0000'); // TODO ACTUAL COLOR ASSIGMENT
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
    const newStands: number[] = [];
    const bbox = getBoundingBox(this.selectStart, this.selectEnd);
    const features = this.mapLibreMap.queryRenderedFeatures(bbox, {
      layers: [this.layers.stands],
    });

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

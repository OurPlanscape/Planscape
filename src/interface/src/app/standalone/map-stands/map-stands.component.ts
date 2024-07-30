import { Component, Input, SimpleChanges } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { LayerSpecification, Map as MapLibreMap, Point } from 'maplibre-gl';
import {
  StandAssigment,
  StandColors,
} from '../project-area/project-area.component';
import { MapStandsService } from './map-stands.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-map-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent, AsyncPipe],
  templateUrl: './map-stands.component.html',
  styleUrl: './map-stands.component.scss',
})
export class MapStandsComponent {
  @Input() projectAreaId = 0;
  @Input() maplibreMap!: MapLibreMap;
  @Input() selectStart!: Point | null;
  @Input() selectEnd!: Point | null;

  selectedStands$ = this.mapStandsService.selectedStands$;
  @Input() treatedStands: { id: number; assigment: StandAssigment }[] = [];

  private initialSelectedStands: number[] = [];

  constructor(private mapStandsService: MapStandsService) {}

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  private updateSelectedStands(selectedStands: number[]) {
    this.mapStandsService.updateSelectedStands(selectedStands);
  }

  clickOnLayer(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
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
    const matchExpression: (string | string[] | number)[] = [];
    matchExpression.push('match');
    matchExpression.push(['get', 'id']);
    // match expression requires at least 2 definitions...
    matchExpression.push(0);
    matchExpression.push('#00a000');
    matchExpression.push(1);
    matchExpression.push('#00a000');

    this.treatedStands.forEach((stand) => {
      matchExpression.push(stand.id);
      matchExpression.push(StandColors[stand.assigment]);
    });
    matchExpression.push('#00000050');

    return matchExpression;
  }

  selectStandsWithinRectangle(): void {
    if (!this.selectStart || !this.selectEnd) {
      this.initialSelectedStands = [
        ...this.mapStandsService.selectedStands$.value,
      ];
      return;
    }
    const start = [this.selectStart.x, this.selectStart.y];
    const end = [this.selectEnd.x, this.selectEnd.y];

    const bbox: [[number, number], [number, number]] = [
      [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
      [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
    ];
    const features = this.maplibreMap.queryRenderedFeatures(bbox, {
      layers: ['stands-layer'],
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['treatedStands']) {
      // update map filter
      this.paint = {
        'fill-outline-color': '#000',
        'fill-color': this.getFillColors() as any,
        'fill-opacity': 0.5,
      };
    }

    if (changes['selectStart'] || changes['selectEnd']) {
      //select stands
      this.selectStandsWithinRectangle();
    }
  }
}

import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { NgForOf } from '@angular/common';
import { getColorForProjectPosition } from '../../plan/plan-helpers';
import { Map as MapLibreMap } from 'maplibre-gl';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [
    FeatureComponent,
    GeoJSONSourceComponent,
    NgForOf,
    LayerComponent,
    VectorSourceComponent,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent {
  @Input() scenarioId!: number;
  @Input() treatmentPlanId!: number;
  @Input() mapLibreMap!: MapLibreMap;

  constructor() {}

  color(i: number) {
    return getColorForProjectPosition(i);
  }

  get vectorLayerUrl() {
    return this.tilesUrl + `?scenario_id=${this.scenarioId}`;
  }

  readonly tilesUrl = environment.martin_server + 'project_areas/{z}/{x}/{y}';
}

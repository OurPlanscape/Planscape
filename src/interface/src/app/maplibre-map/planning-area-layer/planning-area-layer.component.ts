import { Component } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '../../plan/plan.state';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    FeatureComponent,
    GeoJSONSourceComponent,
    LayerComponent,
  ],
  templateUrl: './planning-area-layer.component.html',
})
export class PlanningAreaLayerComponent {
  constructor(private planState: PlanState) {}

  polygonGeometry$ = this.planState.planningAreaGeometry$;

  readonly sourceName = 'treatment-planing-area';
  readonly COLORS = BASE_COLORS;
}

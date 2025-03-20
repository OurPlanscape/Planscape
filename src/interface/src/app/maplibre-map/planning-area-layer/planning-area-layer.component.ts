import { Component } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BASE_COLORS } from '../../treatments/map.styles';
import { PlanState } from '../plan.state';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [
    CommonModule,
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

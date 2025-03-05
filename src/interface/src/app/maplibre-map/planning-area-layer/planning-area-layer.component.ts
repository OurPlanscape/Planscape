import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { Geometry } from 'geojson';
import { BASE_COLORS } from '../../treatments/map.styles';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [FeatureComponent, GeoJSONSourceComponent, LayerComponent],
  templateUrl: './planning-area-layer.component.html',
})
export class PlanningAreaLayerComponent {
  @Input() polygonGeometry!: Geometry;
  readonly sourceName = 'treatment-planing-area';

  readonly COLORS = BASE_COLORS;
}

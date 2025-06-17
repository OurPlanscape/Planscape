import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { GeoJSON } from 'geojson';
import {
  LayerComponent,
  GeoJSONSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'app-map-boundary-layer',
  standalone: true,
  imports: [LayerComponent, NgIf, GeoJSONSourceComponent],
  templateUrl: './map-boundary-layer.component.html',
  styleUrl: './map-boundary-layer.component.scss',
})
export class MapBoundaryLayerComponent {
  @Input() boundaryShape!: GeoJSON;

  constructor() {}
}

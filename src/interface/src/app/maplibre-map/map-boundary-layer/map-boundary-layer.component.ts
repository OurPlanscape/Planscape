import { Component, Input } from '@angular/core';
import { NgIf, AsyncPipe } from '@angular/common';
import { GeoJSON } from 'geojson';
import { Observable } from 'rxjs';
import {
  LayerComponent,
  GeoJSONSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'app-map-boundary-layer',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, GeoJSONSourceComponent],
  templateUrl: './map-boundary-layer.component.html',
  styleUrl: './map-boundary-layer.component.scss',
})
export class MapBoundaryLayerComponent {
  @Input() boundaryShape$!: Observable<GeoJSON | null>;

  constructor() {}
}

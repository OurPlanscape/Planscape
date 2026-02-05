import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import {
  LayerComponent,
  GeoJSONSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { DrawService } from '../draw.service';

@Component({
  selector: 'app-map-boundary-layer',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, NgIf, GeoJSONSourceComponent],
  templateUrl: './map-boundary-layer.component.html',
  styleUrl: './map-boundary-layer.component.scss',
})
export class MapBoundaryLayerComponent {
  boundaryShape$ = this.drawService.loadDrawingBoundary();

  constructor(private drawService: DrawService) {}
}

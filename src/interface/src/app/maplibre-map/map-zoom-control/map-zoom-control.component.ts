import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';
import { MapConfigState } from '../map-config.state';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-map-zoom-control',
  standalone: true,
  imports: [AsyncPipe, ControlComponent, MatIconModule, MatTooltipModule, NgIf],
  templateUrl: './map-zoom-control.component.html',
  styleUrl: './map-zoom-control.component.scss',
})
export class MapZoomControlComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() controlsPosition: ControlPosition = 'top-left';
  maxZoom = 0;
  minZoom = 0;
  mapZoomLevel$ = this.mapConfigState.zoomLevel$;

  constructor(private mapConfigState: MapConfigState) { }

  ngOnInit(): void {
    this.maxZoom = this.mapLibreMap.getMaxZoom();
    this.minZoom = this.mapLibreMap.getMinZoom();
  }

  zoomIn() {
    this.mapLibreMap.zoomIn();
  }

  zoomOut() {
    this.mapLibreMap.zoomOut();
  }
}

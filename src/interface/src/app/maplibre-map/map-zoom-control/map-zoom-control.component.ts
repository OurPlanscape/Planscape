import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { ControlPosition, Map as MapLibreMap } from 'maplibre-gl';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FrontendConstants } from '@map/map.constants';

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
  minZoom: number = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom: number = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;
  curZoom: number = FrontendConstants.MAPLIBRE_MAP_INITIAL_ZOOM;

  constructor() {}

  ngOnInit(): void {
    this.maxZoom = this.mapLibreMap.getMaxZoom();
    this.minZoom = this.mapLibreMap.getMinZoom();
    this.curZoom = this.mapLibreMap.getZoom();
    this.mapLibreMap.on('zoom', () => {
      this.curZoom = this.mapLibreMap.getZoom();
    });
  }

  zoomIn() {
    this.mapLibreMap.zoomIn();
  }

  zoomOut() {
    this.mapLibreMap.zoomOut();
  }
}

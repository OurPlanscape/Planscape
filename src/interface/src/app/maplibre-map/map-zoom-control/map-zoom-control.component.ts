import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';
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
  minZoom = 7; // common defaults
  maxZoom = 17;
  curZoom = 7;

  constructor() { }

  ngOnInit(): void {
    if (this.mapLibreMap) {
      this.maxZoom = this.mapLibreMap.getMaxZoom();
      this.minZoom = this.mapLibreMap.getMinZoom();
      this.curZoom = this.mapLibreMap.getZoom();
      this.mapLibreMap.on('zoom', () => {
        this.curZoom = this.mapLibreMap.getZoom();
      });
    }
  }

  zoomIn() {
    this.mapLibreMap.zoomIn();
  }

  zoomOut() {
    this.mapLibreMap.zoomOut();
  }
}

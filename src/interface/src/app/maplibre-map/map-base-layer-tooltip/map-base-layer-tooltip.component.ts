import { Component, Input, SimpleChanges } from '@angular/core';
import { PopupComponent } from '@maplibre/ngx-maplibre-gl';
import { NgIf } from '@angular/common';
import { LngLat } from 'maplibre-gl';
import {
  Map as MapLibreMap,
} from 'maplibre-gl';

@Component({
  selector: 'app-map-base-layer-tooltip',
  standalone: true,
  imports: [PopupComponent, NgIf],
  templateUrl: './map-base-layer-tooltip.component.html',
  styleUrl: './map-base-layer-tooltip.component.scss',
})
export class MapBaseLayerTooltipComponent {
  @Input() content: string | null = null;
  @Input() lngLat: LngLat | null = null;
  @Input() mapContainer!: MapLibreMap;

  popupAnchor: 'left' | 'right' = 'left'; // Default anchor
  popupOffset: number = 20; // Default offset
  mouseX: number = 0;
  mouseY: number = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lngLat']) {
      this.updatePopupPosition();
    }

  }

  updatePopupPosition() {
    if (this.mapContainer && this.lngLat) {
      const mapCanvas = this.mapContainer.getCanvasContainer()
      const mapWidth = mapCanvas.clientWidth;
      console.log('mapwidth:', mapWidth);
    }
  }
}

import { Component, Input } from '@angular/core';
import { PopupComponent } from '@maplibre/ngx-maplibre-gl';
import { NgIf } from '@angular/common';
import { LngLat } from 'maplibre-gl';

export interface BaseLayerTooltipData {
  content: string;
  longLat: LngLat;
}

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
}

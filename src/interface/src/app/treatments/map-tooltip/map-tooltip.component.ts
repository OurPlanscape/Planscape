import { Component, Input } from '@angular/core';
import { PopupComponent } from '@maplibre/ngx-maplibre-gl';
import { NgIf } from '@angular/common';
import { LngLat } from 'maplibre-gl';

@Component({
  selector: 'app-map-tooltip',
  standalone: true,
  imports: [PopupComponent, NgIf],
  templateUrl: './map-tooltip.component.html',
  styleUrl: './map-tooltip.component.scss',
})
export class MapTooltipComponent {
  @Input() lngLat!: LngLat;
}

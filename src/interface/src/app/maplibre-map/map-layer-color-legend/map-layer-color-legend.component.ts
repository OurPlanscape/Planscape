import { Component, Input } from '@angular/core';
import { NgFor, NgStyle } from '@angular/common';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';
import { LayerStyleEntry } from '@types';

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [NgFor, NgStyle, ControlComponent, MatIconModule, MatTooltipModule],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent {
  @Input() controlsPosition: ControlPosition = 'top-left';
  @Input() mapLibreMap!: MapLibreMap;
  @Input() title: string = '';
  @Input() colorDetails: LayerStyleEntry[] = [];
}

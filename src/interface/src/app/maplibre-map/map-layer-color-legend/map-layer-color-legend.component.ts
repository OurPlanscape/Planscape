import { Component, Input } from '@angular/core';
import { AsyncPipe, NgClass, NgFor, NgStyle} from '@angular/common';
import {
  ControlComponent,
  GeolocateControlDirective,
  NavigationControlDirective,
  ScaleControlDirective,
  TerrainControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';

type ColorWithLabel = {hexCode: string, label: string};

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [NgFor,
    NgStyle,
    AsyncPipe,
    ControlComponent,
    GeolocateControlDirective,
    ScaleControlDirective,
    NavigationControlDirective,
    TerrainControlDirective,
    MatIconModule,
    ButtonComponent,
    MatTooltipModule,
    NgClass,
  ],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss'
})
export class MapLayerColorLegendComponent {
  @Input() controlsPosition: ControlPosition = 'top-left';
  @Input() mapLibreMap!: MapLibreMap;
  @Input() title: string = '';
  @Input() colorDetails: ColorWithLabel[] = [];
}

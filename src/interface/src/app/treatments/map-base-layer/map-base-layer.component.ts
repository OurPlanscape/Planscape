import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import { baseLayerStyles } from '../../maplibre-map/map-base-layers';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { BaseLayerType } from '../../types/maplibre.map.types';

@Component({
  selector: 'app-map-base-layer',
  standalone: true,
  imports: [AsyncPipe, NgForOf],
  templateUrl: './map-base-layer.component.html',
  styleUrl: './map-base-layer.component.scss',
})
export class MapBaseLayerComponent {
  baseLayers = Object.keys(baseLayerStyles) as BaseLayerType[];

  readonly baseLayer$ = this.mapConfigState.baseLayer$;

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseLayer(layer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(layer);
  }
}

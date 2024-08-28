import { Component } from '@angular/core';
import { NgForOf } from '@angular/common';
import {
  baseLayerStyles,
  BaseLayerType,
  DEFAULT_BASE_MAP,
} from '../treatment-map/map-base-layers';
import { MapConfigState } from '../treatment-map/map-config.state';

@Component({
  selector: 'app-map-base-layer',
  standalone: true,
  imports: [NgForOf],
  templateUrl: './map-base-layer.component.html',
  styleUrl: './map-base-layer.component.scss',
})
export class MapBaseLayerComponent {
  baseLayers = Object.keys(baseLayerStyles) as BaseLayerType[];
  readonly defaultLayer = DEFAULT_BASE_MAP;

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseLayer(layer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(layer);
  }
}

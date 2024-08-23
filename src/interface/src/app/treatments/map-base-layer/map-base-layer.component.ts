import { Component } from '@angular/core';
import {
  baseLayerStyles,
  BaseLayerType,
  MapConfigState,
} from '../treatment-map/map-config.state';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'app-map-base-layer',
  standalone: true,
  imports: [NgForOf],
  templateUrl: './map-base-layer.component.html',
  styleUrl: './map-base-layer.component.scss',
})
export class MapBaseLayerComponent {
  terrainTypes = Object.keys(baseLayerStyles) as BaseLayerType[];

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseLayer(layer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(layer);
  }
}

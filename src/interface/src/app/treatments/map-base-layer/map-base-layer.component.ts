import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import {
  baseLayerStyles,
  BaseLayerType,
  DEFAULT_BASE_MAP,
} from '../treatment-map/map-base-layers';
import { MapConfigState } from '../treatment-map/map-config.state';
import { of } from 'rxjs';

@Component({
  selector: 'app-map-base-layer',
  standalone: true,
  imports: [AsyncPipe, NgForOf],
  templateUrl: './map-base-layer.component.html',
  styleUrl: './map-base-layer.component.scss',
})
export class MapBaseLayerComponent {
  baseLayers = Object.keys(baseLayerStyles) as BaseLayerType[];
  readonly defaultLayer = this.mapConfigState.baseLayer$ || of(DEFAULT_BASE_MAP);

  constructor(private mapConfigState: MapConfigState) {}

  updateBaseLayer(layer: BaseLayerType) {
    this.mapConfigState.updateBaseLayer(layer);
  }
}

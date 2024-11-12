import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import {
  baseLayerStyles,
  BaseLayerType,
} from '../treatment-map/map-base-layers';
import { MapConfigState } from '../treatment-map/map-config.state';

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
    // const stands = this.selectedStandsState.getSelectedStands();
    // this.selectedStandsState.clearStands();
    this.mapConfigState.updateBaseLayer(layer);
    // not great, but updating the baseLayer re-renders all the layers, and gets the
    // selected stands completely out of sync.
    // setTimeout(() => {
    //   this.selectedStandsState.updateSelectedStands(stands);
    // }, 10);
  }
}

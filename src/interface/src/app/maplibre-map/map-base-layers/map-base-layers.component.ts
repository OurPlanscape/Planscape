import { Component } from '@angular/core';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { AsyncPipe, NgForOf } from '@angular/common';
import {
  ControlComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { tap } from 'rxjs';

@Component({
  selector: 'app-map-base-layers',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    VectorSourceComponent,
    LayerComponent,
    ControlComponent,
  ],
  templateUrl: './map-base-layers.component.html',
  styleUrl: './map-base-layers.component.scss',
})
export class MapBaseLayersComponent {
  layer = {
    id: 2930,
    map_url: 'https://dev.planscape.org/tiles/dynamic/{z}/{x}/{y}/?layer=2930',
  };
  selectedLayers$ = this.baseLayersStateService.selectedBaseLayers$.pipe(
    tap((s) => console.log(s))
  );

  constructor(private baseLayersStateService: BaseLayersStateService) {}
}

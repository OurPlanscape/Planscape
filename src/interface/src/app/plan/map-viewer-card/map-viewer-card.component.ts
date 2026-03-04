import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { Map as MapLibreMap } from 'maplibre-gl';
import { baseMapStyles } from '@app/maplibre-map/map-base-layers';
import { Plan } from '@app/types';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-map-viewer-card',
  standalone: true,
  imports: [MapComponent, MatIconModule, NgIf, PlanningAreaLayerComponent],
  templateUrl: './map-viewer-card.component.html',
  styleUrl: './map-viewer-card.component.scss',
})
export class MapViewerCardComponent {
  mapLibreMap!: MapLibreMap;
  plan: Plan | null = null;
  baseMap = baseMapStyles.road;
    constructor(
    ) {
      console.log('we have a baseMap?', this.baseMap);
}

  // bounds$ = this.planId$.pipe(
  //   switchMap((id) => {
  //     if (id) {
  //       return this.planState.planningAreaGeometry$.pipe(
  //         map((geometry) => {
  //           return getBoundsFromGeometry(geometry);
  //         })
  //       );
  //     }
  //     return this.mapConfigState.mapExtent$;
  //   })
  // );

}

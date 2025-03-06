import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from 'src/app/maplibre-map/maplibre.helper';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { Geometry } from 'geojson';
import { PlanState } from '../plan.state';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-scenario-map',
  standalone: true,
  imports: [CommonModule, MapComponent, PlanningAreaLayerComponent],
  templateUrl: './scenario-map.component.html',
  styleUrl: './scenario-map.component.scss',
})
export class ScenarioMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private planState: PlanState
  ) {}
  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  /**
   * Observable that waits for the map to be centered
   */
  bounds$ = this.planState.currentPlan$.pipe(
    filter((plan) => !!plan),
    map((plan) => {
      return getBoundsFromGeometry(plan?.geometry as Geometry);
    })
  );

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

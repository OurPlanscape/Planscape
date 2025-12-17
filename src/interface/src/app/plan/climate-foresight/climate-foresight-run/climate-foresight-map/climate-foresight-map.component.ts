import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from 'src/app/maplibre-map/maplibre.helper';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { map } from 'rxjs';
import { OpacitySliderComponent } from '@styleguide';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanState } from 'src/app/plan/plan.state';
import { MapConfigService } from 'src/app/maplibre-map/map-config.service';
import { MapNavbarComponent } from 'src/app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapZoomControlComponent } from 'src/app/maplibre-map/map-zoom-control/map-zoom-control.component';
import { PlanningAreaLayerComponent } from 'src/app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapDataLayerComponent } from 'src/app/maplibre-map/map-data-layer/map-data-layer.component';
import { MapBaseLayersComponent } from 'src/app/maplibre-map/map-base-layers/map-base-layers.component';
import { MapLayerColorLegendComponent } from 'src/app/maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { FrontendConstants } from 'src/app/map/map.constants';

@Component({
  selector: 'app-climate-foresight-map',
  standalone: true,
  imports: [
    CommonModule,
    CommonModule,
    MapComponent,
    MapNavbarComponent,
    OpacitySliderComponent,
    MapZoomControlComponent,
    PlanningAreaLayerComponent,
    LayerComponent,
    MapDataLayerComponent,
    ControlComponent,
    MapLayerColorLegendComponent,
    MatProgressSpinnerModule,
    MapBaseLayersComponent,
  ],
  templateUrl: './climate-foresight-map.component.html',
  styleUrl: './climate-foresight-map.component.scss',
})
export class ClimateForesightMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private planState: PlanState,
    private mapConfigService: MapConfigService
  ) {
    this.mapConfigService.initialize();
  }

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  loading$ = this.planState.isPlanLoading$;

  mapIsLoaded = false;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  opacity$ = this.mapConfigState.opacity$;

  mapLoaded(event: MapLibreMap) {
    this.mapIsLoaded = true;
    this.mapLibreMap = event;
  }

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

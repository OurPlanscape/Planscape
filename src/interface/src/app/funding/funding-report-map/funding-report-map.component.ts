import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '@app/maplibre-map/maplibre.helper';
import { AuthService } from '@app/services';
import { FrontendConstants } from '@app/map/map.constants';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, map } from 'rxjs';
import { EventData } from '@angular/cdk/testing';
import { MapZoomControlComponent } from '@app/maplibre-map/map-zoom-control/map-zoom-control.component';
import { MapBaseLayersComponent } from '@app/maplibre-map/map-base-layers/map-base-layers.component';
import { MapDataLayerComponent } from '@app/maplibre-map/map-data-layer/map-data-layer.component';
import { PlanState } from '@app/plan/plan.state';

@Component({
  selector: 'app-funding-report-map',
  standalone: true,
  imports: [
    AsyncPipe,
    ControlComponent,
    LayerComponent,
    MapBaseLayersComponent,
    MapDataLayerComponent,
    MapComponent,
    MatProgressSpinnerModule,
    MapZoomControlComponent,
    MapNavbarComponent,
    OpacitySliderComponent,
  ],
  templateUrl: './funding-report-map.component.html',
  styleUrl: './funding-report-map.component.scss',
})
export class FundingReportMapComponent {
  mapLibreMap!: MapLibreMap;
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;
  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  //Funding Report dependencies
  loading$ = new BehaviorSubject<boolean>(false);

  // TODO: use separate instance of mapconfigstate?
  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private planState: PlanState
  ) {}

  opacity$ = this.mapConfigState.opacity$;

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }

  onMapError(event: ErrorEvent & EventData) {
    const status = (event.error as any)?.status;
    if (status >= 500 && status < 600) {
      console.log('error');
    }
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

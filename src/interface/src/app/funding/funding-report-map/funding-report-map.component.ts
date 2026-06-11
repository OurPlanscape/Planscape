import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
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
import { BehaviorSubject, map, of } from 'rxjs';
import { EventData } from '@angular/cdk/testing';
import { MapZoomControlComponent } from '@app/maplibre-map/map-zoom-control/map-zoom-control.component';
import { MapBaseLayersComponent } from '@app/maplibre-map/map-base-layers/map-base-layers.component';
import { MapDataLayerComponent } from '@app/maplibre-map/map-data-layer/map-data-layer.component';
import { PlanState } from '@app/plan/plan.state';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { MapMultiProjectAreasComponent } from '../map-multi-project-areas/map-multi-project-areas.component';

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
    MapMultiProjectAreasComponent,
    MapZoomControlComponent,
    MatProgressSpinnerModule,
    NgIf,
    PlanningAreaLayerComponent,
  ],
  templateUrl: './funding-report-map.component.html',
  styleUrl: './funding-report-map.component.scss',
})
export class FundingReportMapComponent {
  // TODO: use separate instance of mapconfigstate?
  constructor(
    private mapConfigState: MapConfigState,
    private mapConfigService: MapConfigService,
    private authService: AuthService,
    private planState: PlanState
  ) {
    this.mapConfigService.initialize();
  }

  @Input() handleInteractions = true; // TODO: actually use this

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

  opacity$ = this.mapConfigState.opacity$;

  showProjectAreas$ = of(true); // TODO: replace w actual state
  projectAreaCount$ = of(4); // TODO: replace w actual state
  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      console.log('we have geometry?', geometry);
      return getBoundsFromGeometry(geometry);
    })
  );

  //Funding Report dependencies
  loading$ = new BehaviorSubject<boolean>(false);

  mapLoaded(loadedMap: MapLibreMap) {
    this.mapLibreMap = loadedMap;
    console.log('we have a map?', this.mapLibreMap);
  }

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }

  onMapError(event: ErrorEvent & EventData) {
    const status = (event.error as any)?.status;
    if (status >= 500 && status < 600) {
      // TODO: handle errors
    }
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

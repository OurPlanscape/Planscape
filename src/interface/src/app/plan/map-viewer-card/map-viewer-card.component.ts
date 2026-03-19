import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapComponent, LayerComponent } from '@maplibre/ngx-maplibre-gl';
import { Map, Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { Extent, Plan } from '@app/types';
import { AsyncPipe, NgIf } from '@angular/common';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { PlanState } from '../plan.state';
import bbox from '@turf/bbox';
import { filter, tap } from 'rxjs';
import { addRequestHeaders } from '@app/maplibre-map/maplibre.helper';
import { AuthService } from '@app/services';
import { RouterModule } from '@angular/router';
import { FrontendConstants } from '@app/map/map.constants';

@Component({
  selector: 'app-map-viewer-card',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    LayerComponent,
    MatIconModule,
    NgIf,
    PlanningAreaLayerComponent,
    RouterModule,
  ],
  providers: [MapConfigState],
  templateUrl: './map-viewer-card.component.html',
  styleUrl: './map-viewer-card.component.scss',
})
export class MapViewerCardComponent {
  mapLibreMap!: MapLibreMap;
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;
  currentPlan$ = this.planState.currentPlan$;

  boundsOptions = {
    padding: {
      top: 18,
      bottom: 76,
      left: 20,
      right: 20,
    },
    duration: 0,
    maxZoom: FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM,
  };

  constructor(
    private mapConfigState: MapConfigState,
    private mapConfigService: MapConfigService,
    private planState: PlanState,
    private authService: AuthService
  ) {
    this.mapConfigService.initialize();
    this.mapConfigState.setShowMapControls(false);
    this.mapConfigState.updateBaseMap('terrain');
  }

  onMapLoad(map: Map) {
    this.mapLibreMap = map;
    this.fitToPlan();
  }

  fitToPlan() {
    this.currentPlan$
      .pipe(
        filter((plan) => !!plan && !!plan.geometry),
        tap((plan: Plan) => {
          const bounds = bbox(plan.geometry) as Extent;
          if (this.mapLibreMap) {
            this.mapLibreMap.fitBounds(bounds, this.boundsOptions);
          }
        })
      )
      .subscribe();
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

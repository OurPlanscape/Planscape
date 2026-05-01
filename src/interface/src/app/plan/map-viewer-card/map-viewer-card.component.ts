import { Component, HostBinding, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapComponent, LayerComponent } from '@maplibre/ngx-maplibre-gl';
import { Map, Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { AsyncPipe, NgIf } from '@angular/common';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from '@app/maplibre-map/maplibre.helper';
import { AuthService } from '@app/services';
import { RouterModule } from '@angular/router';
import { FrontendConstants } from '@app/map/map.constants';
import { baseMapStyles } from '@app/maplibre-map/map-base-layers';
import { PlanState } from '../plan.state';
import { map } from 'rxjs';
import { MapProjectAreasComponent } from '@app/maplibre-map/map-project-areas/map-project-areas.component';

@Component({
  selector: 'app-map-viewer-card',
  standalone: true,
  imports: [
    AsyncPipe,
    MapComponent,
    LayerComponent,
    MapProjectAreasComponent,
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
  @Input() height: 'tall' | 'normal' = 'normal';

  @Input() showProjectAreas: boolean = false;

  mapLibreMap!: MapLibreMap;
  baseLayerUrl = baseMapStyles['terrain'];
  currentPlan$ = this.planState.currentPlan$;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

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
  }

  onMapLoad(map: Map) {
    this.mapLibreMap = map;
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  @HostBinding('class.tall')
  get isTall() {
    return this.height === 'tall';
  }
}

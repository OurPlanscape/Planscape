import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import {
  LngLat,
  Map as MapLibreMap,
  RequestTransformFunction,
} from 'maplibre-gl';
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
import { BehaviorSubject, map, Subject } from 'rxjs';
import { EventData } from '@angular/cdk/testing';
import { MapZoomControlComponent } from '@app/maplibre-map/map-zoom-control/map-zoom-control.component';
import { MapBaseLayersComponent } from '@app/maplibre-map/map-base-layers/map-base-layers.component';
import { MapDataLayerComponent } from '@app/maplibre-map/map-data-layer/map-data-layer.component';
import { PlanState } from '@app/plan/plan.state';
import { PlanningAreaLayerComponent } from '@app/maplibre-map/planning-area-layer/planning-area-layer.component';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { MapMultiProjectAreasComponent } from '../map-multi-project-areas/map-multi-project-areas.component';
import { ScenarioState } from '@app/scenario/scenario.state';
import { MapTooltipComponent } from '@app/treatments/map-tooltip/map-tooltip.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { DataLayer } from '@app/types';
import { MatIconModule } from '@angular/material/icon';

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
    MapTooltipComponent,
    MapZoomControlComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    NgIf,
    PlanningAreaLayerComponent,
  ],
  templateUrl: './funding-report-map.component.html',
  styleUrl: './funding-report-map.component.scss',
})
export class FundingReportMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private mapConfigService: MapConfigService,
    private authService: AuthService,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private dataLayersStateService: DataLayersStateService
  ) {
    this.mapConfigService.initialize();
  }

  @Input() allowInteraction = true;

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

  projectAreaCount$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      return scenario.scenario_result?.result?.features.length;
    })
  );

  selectedLayer$ = this.dataLayersStateService.viewedDataLayer$;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  hoveredProjectAreaId$ = new Subject<number | null>();
  mouseLngLat: LngLat | null = null;

  planningApproach$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => scenario.planning_approach ?? 'OPTIMIZE_PROJECT_AREAS')
  );

  loading$ = new BehaviorSubject<boolean>(false);

  mapLoaded(loadedMap: MapLibreMap) {
    this.mapLibreMap = loadedMap;
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

  setHoveredProjectAreaId(value: number | null) {
    this.hoveredProjectAreaId$.next(value);
  }

  setMouseLngLat(value: LngLat | null) {
    this.mouseLngLat = value;
  }

  goToSelectedLayer(layer: DataLayer) {
    this.dataLayersStateService.goToSelectedLayer(layer);
  }

  clearSelectedLayer() {
    this.dataLayersStateService.clearViewedDataLayer();
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

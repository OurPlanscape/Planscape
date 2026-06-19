import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
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
import { ButtonComponent } from '@styleguide';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@app/shared';
import { FundingMapConfigState } from '../funding-map-config-state';

@Component({
  selector: 'app-funding-report-map',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
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
    private fundingMapConfigState: FundingMapConfigState,
    private mapConfigService: MapConfigService,
    private dataLayersStateService: DataLayersStateService,
    private authService: AuthService,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private matSnackBar: MatSnackBar
  ) {
    this.mapConfigService.initialize();
    this.loading$.next(true);
  }

  @Input() allowInteraction = true;

  mapLibreMap!: MapLibreMap;
  /**
   * Maplibre defaults
   */
  minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  baseLayerUrl$ = this.fundingMapConfigState.baseMapUrl$;

  opacity$ = this.fundingMapConfigState.opacity$;

  loading$ = new BehaviorSubject<boolean>(false);

  projectAreaCount$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      return scenario.scenario_result?.result?.features.length;
    })
  );

  scenarioOrigin$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => scenario.origin)
  );

  planningApproach$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => scenario.planning_approach ?? 'OPTIMIZE_PROJECT_AREAS')
  );

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  selectedLayer$ = this.dataLayersStateService.viewedDataLayer$;

  hoveredProjectAreaId$ = new Subject<number | null>();
  mouseLngLat: LngLat | null = null;

  mapLoaded(loadedMap: MapLibreMap) {
    this.mapLibreMap = loadedMap;
    this.loading$.next(false);
  }

  handleOpacityChange(opacity: number) {
    this.fundingMapConfigState.setOpacity(opacity);
  }

  onMapError(event: ErrorEvent & EventData) {
    const status = (event.error as any)?.status;
    if (status >= 500 && status < 600) {
      this.showMapError();
    }
  }

  showMapError() {
    // TODO: confirm this message
    this.matSnackBar.open(
      'There was a problem loading the funding report map.',
      'Dismiss',
      {
        ...SNACK_ERROR_CONFIG,
        panelClass: ['snackbar-error', 'snackbar-error-multiline'],
      }
    );
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

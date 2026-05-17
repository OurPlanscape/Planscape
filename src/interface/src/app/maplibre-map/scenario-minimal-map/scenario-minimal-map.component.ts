import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import {
  EventData,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { addRequestHeaders, getBoundsFromGeometry } from '../maplibre.helper';
import { MapConfigState } from '../map-config.state';
import { PlanningAreaLayerComponent } from '@maplibre-map/planning-area-layer/planning-area-layer.component';
import { map, of, switchMap } from 'rxjs';
import { MapProjectAreasComponent } from '@maplibre-map/map-project-areas/map-project-areas.component';
import { PlanState } from '@plan/plan.state';
import { ScenarioState } from '@scenario/scenario.state';

import { MapConfigService } from '../map-config.service';
import { FrontendConstants } from '@map/map.constants';
import { FeaturesModule } from '@features/features.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';

@UntilDestroy()
@Component({
  selector: 'app-scenario-minimal-map',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    PlanningAreaLayerComponent,
    MapProjectAreasComponent,
    LayerComponent,
    FeaturesModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './scenario-minimal-map.component.html',
  styleUrl: './scenario-minimal-map.component.scss',
  providers: [DataLayersStateService, MapConfigState],
})
export class ScenarioMinimalMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private authService: AuthService,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private mapConfigService: MapConfigService,
    private newScenarioState: NewScenarioState
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

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  projectAreaCount$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      return scenario.scenario_result?.result?.features.length;
    })
  );

  planningApproach$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => scenario.planning_approach ?? 'OPTIMIZE_PROJECT_AREAS')
  );

  showProjectAreas$ = this.scenarioState.currentScenarioId$.pipe(
    switchMap((scenarioId) => {
      if (!scenarioId) {
        return of(false);
      }
      return this.scenarioState.currentScenario$.pipe(
        map((scenario) => {
          return scenario.scenario_result?.status === 'SUCCESS';
        })
      );
    })
  );

  loading$ = this.newScenarioState.loading$;

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  onMapError(event: ErrorEvent & EventData) {
    const status = (event.error as any)?.status;
    if (status >= 500 && status < 600) {
      this.newScenarioState.showMapError();
    }
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

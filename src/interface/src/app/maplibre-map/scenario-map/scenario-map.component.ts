import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { addRequestHeaders, getBoundsFromGeometry } from '../maplibre.helper';
import { MapConfigState } from '../map-config.state';
import { PlanningAreaLayerComponent } from '@maplibre-map/planning-area-layer/planning-area-layer.component';
import { combineLatest, map, mergeMap, of, switchMap } from 'rxjs';
import { MapNavbarComponent } from '@maplibre-map/map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { MapProjectAreasComponent } from '@maplibre-map/map-project-areas/map-project-areas.component';
import { PlanState } from '@plan/plan.state';
import { ScenarioState } from '@scenario/scenario.state';
import { MapZoomControlComponent } from '@maplibre-map/map-zoom-control/map-zoom-control.component';

import { MapDataLayerComponent } from '@maplibre-map/map-data-layer/map-data-layer.component';
import { MapLayerColorLegendComponent } from '@maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { MapConfigService } from '../map-config.service';
import { DataLayerNameComponent } from '@data-layers/data-layer-name/data-layer-name.component';
import { FrontendConstants } from '@map/map.constants';
import { ScenarioLegendComponent } from '@scenario-creation/scenario-legend/scenario-legend.component';
import { FeaturesModule } from '@features/features.module';
import { ScenarioStandsComponent } from '@maplibre-map/scenario-stands/scenario-stands.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NewScenarioState } from '@scenario-creation/new-scenario.state';
import { MapBaseLayersComponent } from '@maplibre-map/map-base-layers/map-base-layers.component';
import { Scenario } from '@types';

@Component({
  selector: 'app-scenario-map',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    MapNavbarComponent,
    OpacitySliderComponent,
    PlanningAreaLayerComponent,
    MapProjectAreasComponent,
    MapZoomControlComponent,
    LayerComponent,
    MapDataLayerComponent,
    ControlComponent,
    MapLayerColorLegendComponent,
    DataLayerNameComponent,
    ScenarioLegendComponent,
    FeaturesModule,
    ScenarioStandsComponent,
    MatProgressSpinnerModule,
    MapBaseLayersComponent,
  ],
  templateUrl: './scenario-map.component.html',
  styleUrl: './scenario-map.component.scss',
})
export class ScenarioMapComponent {
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

  isScenarioSuccessful$ = this.scenarioState.isScenarioSuccessful$;

  opacityTooltip$ = this.scenarioState.currentScenarioId$.pipe(
    map((scenarioId) => (scenarioId ? 'Project Area Opacity' : 'Stand Opacity'))
  );

  //check values of currentScenarioId and currentScenario (which might be empty)
  showScenarioStands$ = this.scenarioState.currentScenarioId$.pipe(
    mergeMap((scenarioId) => {
      if (!scenarioId) {
        return of(true);
      }
      // If scenarioId exists, we then check currentScenario$
      return this.scenarioState.currentScenario$.pipe(
        map((scenario: Scenario) => {
          // If the scenario exists and its status is 'DRAFT', return true
          return scenario?.scenario_result?.status === 'DRAFT';
        })
      );
    })
  );

  showOpacitySlider$ = combineLatest([
    this.isScenarioSuccessful$,
    this.newScenarioState.currentStep$,
  ]).pipe(
    map(([isScenarioSuccessful, step]) => isScenarioSuccessful || step !== null)
  );

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

  opacity$ = this.mapConfigState.opacity$;

  projectAreaCount$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      return scenario.scenario_result?.result?.features.length;
    })
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

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  ControlComponent,
  EventData,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { ModuleService } from '@app/services/module.service';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import { addRequestHeaders, getBoundsFromGeometry } from '../maplibre.helper';
import { MapConfigState } from '../map-config.state';
import { PlanningAreaLayerComponent } from '@maplibre-map/planning-area-layer/planning-area-layer.component';
import { combineLatest, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { isPlanningApproachSubUnits } from '@scenario/scenario-helper';
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
import { ApiModule, Scenario, SubUnits } from '@types';
import { SubUnitToggleComponent } from '@maplibre-map/sub-unit-toggle/sub-unit-toggle.component';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';

@UntilDestroy()
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
    SubUnitToggleComponent,
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
    private newScenarioState: NewScenarioState,
    private moduleService: ModuleService,
    private baseLayersStateService: BaseLayersStateService
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

  private showSubUnitToggleOnDrafts$ = combineLatest([
    this.newScenarioState.currentStep$,
    this.newScenarioState.scenarioConfig$,
    this.newScenarioState.selectedSubUnitLayer$,
  ]).pipe(
    map(
      ([step, config, layer]) =>
        step?.showSubUnitToggle !== false &&
        !!config.planning_approach &&
        isPlanningApproachSubUnits(config.planning_approach) &&
        !!layer
    )
  );

  private showSubUnitToggleOnResults$ = combineLatest([
    this.isScenarioSuccessful$,
    this.scenarioState.currentScenario$,
  ]).pipe(
    map(
      ([isScenarioSuccessful, scenario]) =>
        isScenarioSuccessful &&
        !!scenario.planning_approach &&
        isPlanningApproachSubUnits(scenario.planning_approach)
    )
  );

  private showSubUnitToggle$ = combineLatest([
    this.showSubUnitToggleOnDrafts$,
    this.showSubUnitToggleOnResults$,
  ]).pipe(map(([onDrafts, onResults]) => onDrafts || onResults));

  private subUnitLayer$ = this.newScenarioState.selectedSubUnitLayer$.pipe(
    switchMap((draftLayer) => {
      if (draftLayer) {
        return of(draftLayer);
      }
      const layerId = this.scenarioState.currentSubUnitsLayerId;
      if (!layerId) {
        return of(null);
      }
      return this.moduleService
        .getModule<ApiModule<SubUnits>>('prioritize_sub_units')
        .pipe(
          map(
            (result) =>
              result.options.sub_units.find((l) => l.id === layerId) ?? null
          )
        );
    })
  );

  subUnitToggleLayer$ = combineLatest([
    this.showSubUnitToggle$,
    this.subUnitLayer$,
  ]).pipe(
    map(([show, layer]) => (show && layer ? layer : null)),
    tap((layer) => {
      if (layer) this.baseLayersStateService.addBaseLayer(layer);
    }),
    untilDestroyed(this)
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

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

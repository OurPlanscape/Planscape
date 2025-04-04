import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from 'src/app/maplibre-map/maplibre.helper';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { map } from 'rxjs';
import { MapNavbarComponent } from '../map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { PlanState } from '../../plan/plan.state';
import { ScenarioState } from '../scenario.state';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-scenario-map',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    MapNavbarComponent,
    MapControlsComponent,
    OpacitySliderComponent,
    PlanningAreaLayerComponent,
    MapProjectAreasComponent,
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
    private route: ActivatedRoute
  ) {}

  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  scenarioId$ = this.scenarioState.currentScenarioId$;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  projectAreasOpacity$ = this.mapConfigState.projectAreasOpacity$;

  projectAreaCount$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      return scenario.scenario_result?.result?.features.length;
    })
  );

  showProjectAreas = this.route.firstChild?.snapshot?.data['showProjectAreas'];

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setProjectAreasOpacity(opacity);
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

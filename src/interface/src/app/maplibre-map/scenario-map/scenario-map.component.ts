import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService, ScenarioService } from '@services';
import { Map as MapLibreMap, RequestTransformFunction } from 'maplibre-gl';
import {
  addRequestHeaders,
  getBoundsFromGeometry,
} from 'src/app/maplibre-map/maplibre.helper';
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { PlanningAreaLayerComponent } from '../planning-area-layer/planning-area-layer.component';
import { PlanState } from '../plan.state';
import { map } from 'rxjs';
import { MapNavbarComponent } from '../map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { BehaviorSubject } from 'rxjs';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
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
    private route: ActivatedRoute,
    private scenarioService: ScenarioService
  ) {
    const routeChild = this.route.snapshot.firstChild;
    const path = routeChild?.url[0].path;
    const scenarioId = routeChild?.params['id'];
    if (path === 'config' && scenarioId) {
      console.log('Path: ', path);
      console.log('routeChild: ', routeChild);
      console.log('scenarioId: ', scenarioId);
      this.scenarioService.getScenario(scenarioId).subscribe((scenario) => {
        this.planState.setCurrentScenario(scenario);

        // update config on map, based on route data
        this.mapConfigState.updateShowProjectAreas(true);
        this.mapConfigState.updateShowTreatmentStands(true);
        this.mapConfigState.setStandSelectionEnabled(false);

        this.mapConfigState.setShowFillProjectAreas(true);

        this.mapConfigState.setTreatmentLegendVisible(false);
        this.mapConfigState.setShowMapControls(false);
      });
    }
  }
  /**
   * The mapLibreMap instance, set by the map `mapLoad` event.
   */
  mapLibreMap!: MapLibreMap;

  /**
   * Observable that provides the url to load the selected map base layer
   */
  baseLayerUrl$ = this.mapConfigState.baseLayerUrl$;
  //placeholder until we add the layers to update
  projectLayerOpacity$ = new BehaviorSubject<number>(1);

  bounds$ = this.planState.planningAreaGeometry$.pipe(
    map((geometry) => {
      return getBoundsFromGeometry(geometry);
    })
  );

  scenario$ = this.planState.currentScenario$;

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  handleOpacityChange(opacity: number) {
    // just a placeholder until we include the layer this changes
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

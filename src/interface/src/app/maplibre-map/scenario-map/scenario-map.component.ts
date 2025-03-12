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
import { PlanState } from '../plan.state';
import { map } from 'rxjs';
import { MapNavbarComponent } from '../map-nav-bar/map-nav-bar.component';
import { OpacitySliderComponent } from '@styleguide';
import { BehaviorSubject } from 'rxjs';
import { MapControlsComponent } from '../map-controls/map-controls.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { TreatmentsState } from 'src/app/treatments/treatments.state';
import { getMergedRouteData } from 'src/app/treatments/treatments-routing-data';
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
    private treatmentsState: TreatmentsState,
    private route: ActivatedRoute
  ) {
    const data = getMergedRouteData(this.route.snapshot);
    console.log('Data: ', data);
    const plan = this.planState.getCurrentPlan();
    if (plan) {
      this.treatmentsState.setInitialState({
        scenarioId: 2206,
        treatmentId: 628,
        projectAreaId: undefined,
        planId: plan.id,
        showMapProjectAreas: true,
        showTreatmentStands: false,
        showMapControls: false,
        standSelectionEnabled: false,
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

  mapLoaded(event: MapLibreMap) {
    this.mapLibreMap = event;
  }

  handleOpacityChange(opacity: number) {
    // just a placeholder until we include the layer this changes
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());
}

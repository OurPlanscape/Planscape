import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { getColorForProjectPosition } from '../../plan/plan-helpers';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [
    FeatureComponent,
    GeoJSONSourceComponent,
    LayerComponent,
    VectorSourceComponent,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent {
  scenarioId = this.treatmentsState.getScenarioId();
  @Input() mapLibreMap!: MapLibreMap;

  readonly layerName = 'project_areas_by_scenario';
  readonly tilesUrl =
    environment.martin_server + 'project_areas_by_scenario/{z}/{x}/{y}';

  constructor(
    private treatmentsState: TreatmentsState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get vectorLayerUrl() {
    return this.tilesUrl + `?scenario_id=${this.scenarioId}`;
  }

  paint: LayerSpecification['paint'] = {
    'fill-outline-color': '#000',
    'fill-color': this.getFillColors() as any,
    'fill-opacity': 0.5,
  };

  getFillColors() {
    const defaultColor = '#00000050';
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'rank'],
    ];
    for (let i = 1; i < 11; i++) {
      matchExpression.push(i.toString(), getColorForProjectPosition(i));
    }
    matchExpression.push(defaultColor);
    return matchExpression;
  }

  goToProjectArea(event: MapMouseEvent) {
    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: ['map-project-areas-fill'],
    });

    const projectAreaId = features[0].properties['id'];
    this.router
      .navigate(['project-area', projectAreaId], {
        relativeTo: this.route,
      })
      .then(() => {
        this.mapLibreMap.getCanvas().style.cursor = '';
      });
  }

  setCursor() {
    this.mapLibreMap.getCanvas().style.cursor = 'pointer';
  }

  resetCursor() {
    this.mapLibreMap.getCanvas().style.cursor = '';
  }
}

import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { getColorForProjectPosition } from '../../plan/plan-helpers';
import {
  LayerSpecification,
  LngLat,
  Map as MapLibreMap,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
} from 'rxjs';
import { Prescription, TreatmentProjectArea } from '@types';

@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [
    FeatureComponent,
    GeoJSONSourceComponent,
    LayerComponent,
    VectorSourceComponent,
    PopupComponent,
    MatIconModule,
    NgForOf,
    NgIf,
    AsyncPipe,
    MapTooltipComponent,
    JsonPipe,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent {
  @Input() mapLibreMap!: MapLibreMap;
  scenarioId = this.treatmentsState.getScenarioId();
  summary$ = this.treatmentsState.summary$;
  mouseLngLat: LngLat | null = null;

  activeProjectAreaId$ = new Subject<number>();
  activeProjectArea$: Observable<TreatmentProjectArea | undefined> =
    combineLatest([
      this.summary$,
      this.activeProjectAreaId$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([summary, projectAreaId]) => {
        return summary?.project_areas.find(
          (p) => p.project_area_id === projectAreaId
        );
      })
    );

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
    const projectAreaId = this.getProjectAreaIdFromFeatures(event.point);
    if (projectAreaId) {
      this.treatmentsState.selectProjectArea(projectAreaId);
    }

    this.mouseLngLat = null;

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

  setProjectAreaTooltip(e: MapMouseEvent) {
    // if I have a project area ID im transitioning to the project area view.
    if (this.treatmentsState.getProjectAreaId()) {
      return;
    }
    this.mouseLngLat = e.lngLat;
    const newId = this.getProjectAreaIdFromFeatures(e.point);

    if (newId) {
      this.activeProjectAreaId$.next(newId);
    }
  }

  resetCursorAndTooltip(e: MapMouseEvent) {
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.mouseLngLat = null;
  }

  private getProjectAreaIdFromFeatures(point: Point): number | null {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0].properties['id'];
  }

  getPrescriptionStandCount(prescriptions: Prescription[]) {
    return prescriptions.reduce((total: number, prescription) => {
      total = total + prescription.treated_stand_count;
      return total;
    }, 0);
  }
}

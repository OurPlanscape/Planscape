import { Component, Input } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  LngLat,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { TreatmentsState } from '../../treatments/treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf, PercentPipe } from '@angular/common';
import { MapTooltipComponent } from '../../treatments/map-tooltip/map-tooltip.component';
import { BASE_COLORS, LABEL_PAINT } from '../../treatments/map.styles';

import { TreatmentProjectArea } from '@types';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
} from 'rxjs';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { PlanState } from '../plan.state';

type MapLayerData = {
  readonly name: string;
  readonly sourceLayer: string;
  paint?: LayerSpecification['paint'];
  color?: string;
};

@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [
    LayerComponent,
    VectorSourceComponent,
    MatIconModule,
    NgIf,
    AsyncPipe,
    MapTooltipComponent,
    PercentPipe,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;
  @Input() showTooltips = true;

  private readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

  scenarioId = this.planState.getScenarioId();
  summary$ = this.treatmentsState.summary$;
  mouseLngLat: LngLat | null = null;

  hoveredProjectAreaId$ = new Subject<number | null>();
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;
  hoveredProjectArea$: Observable<TreatmentProjectArea | undefined> =
    combineLatest([
      this.summary$,
      this.hoveredProjectAreaId$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([summary, projectAreaId]) => {
        return summary?.project_areas.find(
          (p: TreatmentProjectArea) => p.project_area_id === projectAreaId
        );
      })
    );

  readonly layers: Record<
    | 'projectAreasOutline'
    | 'projectAreasHighlight'
    | 'projectAreasFill'
    | 'projectAreaLabels',
    MapLayerData
  > = {
    projectAreasOutline: {
      name: 'map-project-areas-line',
      sourceLayer: this.martinSource.sources.projectAreasByScenario,
      color: BASE_COLORS.dark,
    },
    projectAreasHighlight: {
      name: 'map-project-areas-highlight',
      sourceLayer: this.martinSource.sources.projectAreasByScenario,
      color: BASE_COLORS.yellow,
    },
    projectAreasFill: {
      name: 'map-project-areas-fill',
      sourceLayer: this.martinSource.sources.projectAreasByScenario,
      color: BASE_COLORS.almost_white,
    },
    projectAreaLabels: {
      name: 'map-project-areas-labels',
      sourceLayer: this.martinSource.sources.projectAreasByScenarioLabel,
      paint: LABEL_PAINT,
    },
  };

  constructor(
    private treatmentsState: TreatmentsState,
    private planState: PlanState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get vectorLayerUrl() {
    return this.martinSource.tilesUrl + `?scenario_id=${this.scenarioId}`;
  }

  goToProjectArea(event: MapMouseEvent) {
    const projectAreaId = this.getProjectAreaFromFeatures(event.point)
      .properties['id'];
    this.mouseLngLat = null;

    this.resetCursorAndTooltip();
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
    // if I have a project area ID im transitioning to the project area view,
    // so we won't set a tooltip here
    if (this.treatmentsState.getProjectAreaId()) {
      return;
    }
    this.hoveredProjectAreaFromFeatures = this.getProjectAreaFromFeatures(
      e.point
    );
    if (this.hoveredProjectAreaFromFeatures?.properties?.['id']) {
      this.hoveredProjectAreaId$.next(
        this.hoveredProjectAreaFromFeatures.properties['id']
      );
    }

    this.mouseLngLat = e.lngLat;
  }

  resetCursorAndTooltip() {
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.hoveredProjectAreaFromFeatures = null;
    this.hoveredProjectAreaId$.next(null);

    this.mouseLngLat = null;
  }

  private getProjectAreaFromFeatures(point: Point): MapGeoJSONFeature {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0];
  }
}

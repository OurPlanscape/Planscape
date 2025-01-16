import { Component, Input, OnInit } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { getColorForProjectPosition } from '../../plan/plan-helpers';
import {
  LayerSpecification,
  LngLat,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf, PercentPipe } from '@angular/common';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { BASE_COLORS, LABEL_PAINT } from '../map.styles';

import { TreatmentProjectArea } from '@types';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
} from 'rxjs';
import { MapConfigState } from '../treatment-map/map-config.state';
import { ColorService } from 'src/app/color.service';

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
export class MapProjectAreasComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;
  @Input() withFill = true;
  @Input() showTooltips = true;

  scenarioId = this.treatmentsState.getScenarioId();
  summary$ = this.treatmentsState.summary$;
  mouseLngLat: LngLat | null = null;
  fillColor!: any;

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
  hoveredFillColor = BASE_COLORS['dark'];

  readonly tilesUrl =
    environment.martin_server + 'project_areas_by_scenario/{z}/{x}/{y}';

  readonly layers: Record<
    'projectAreasOutline' | 'projectAreasFill' | 'projectAreaLabels',
    MapLayerData
  > = {
    projectAreasOutline: {
      name: 'map-project-areas-line',
      sourceLayer: 'project_areas_by_scenario',
      color: BASE_COLORS['dark'],
    },
    projectAreasFill: {
      name: 'map-project-areas-fill',
      sourceLayer: 'project_areas_by_scenario',
    },
    projectAreaLabels: {
      name: 'map-project-areas-labels',
      sourceLayer: 'project_areas_by_scenario_label',
      paint: LABEL_PAINT,
    },
  };

  textSize$ = this.mapConfigState.zoomLevel$.pipe(
    map((zoomLevel) => (zoomLevel > 9 ? 14 : 0))
  );

  constructor(
    private treatmentsState: TreatmentsState,
    private router: Router,
    private route: ActivatedRoute,
    private mapConfigState: MapConfigState,
    private colorService: ColorService
  ) {}

  get vectorLayerUrl() {
    return this.tilesUrl + `?scenario_id=${this.scenarioId}`;
  }

  ngOnInit() {
    this.fillColor = this.getFillColors();
  }

  getFillColors() {
    const defaultColor = BASE_COLORS['dark'];
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'rank'],
    ];
    for (let i = 1; i <= this.treatmentsState.projectAreaCount(); i++) {
      matchExpression.push(i.toString(), getColorForProjectPosition(i));
    }
    matchExpression.push(defaultColor);
    return matchExpression as any;
  }

  goToProjectArea(event: MapMouseEvent) {
    const projectAreaId = this.getProjectAreaFromFeatures(event.point)
      .properties['id'];
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
    this.updateHoveredFillColor(
      this.hoveredProjectAreaFromFeatures.properties['rank']
    );
    this.mouseLngLat = e.lngLat;
  }

  resetCursorAndTooltip(e: MapMouseEvent) {
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.hoveredProjectAreaFromFeatures = null;
    this.hoveredProjectAreaId$.next(null);
    this.updateHoveredFillColor(null);
    this.mouseLngLat = null;
  }

  private getProjectAreaFromFeatures(point: Point): MapGeoJSONFeature {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0];
  }

  updateHoveredFillColor(projectAreaRank: number | null) {
    if (projectAreaRank) {
      const baseColor = getColorForProjectPosition(projectAreaRank);
      this.hoveredFillColor = this.colorService.darkenColor(baseColor, 20);
    } else {
      this.hoveredFillColor = BASE_COLORS['dark'];
    }
  }
}

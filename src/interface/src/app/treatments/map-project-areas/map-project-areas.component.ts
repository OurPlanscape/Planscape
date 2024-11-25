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
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf } from '@angular/common';
import { MapTooltipComponent } from '../map-tooltip/map-tooltip.component';
import { BASE_COLORS, LABEL_PAINT } from '../map.styles';
import { getTreatedStandsTotal } from '../prescriptions';
import { TreatmentProjectArea } from '@types';
import {
  combineLatest,
  Observable,
  distinctUntilChanged,
  Subject,
  map,
} from 'rxjs';

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
  fillColor: any;
  getTreatedStandsTotal = getTreatedStandsTotal;

  hoveredProjectAreaId$ = new Subject<number>();
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

  textSize$ = this.treatmentsState.projectAreaLabelsSize$;

  constructor(
    private treatmentsState: TreatmentsState,
    private router: Router,
    private route: ActivatedRoute
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
    for (let i = 1; i < 11; i++) {
      matchExpression.push(i.toString(), getColorForProjectPosition(i));
    }
    matchExpression.push(defaultColor);
    return matchExpression as any;
  }

  goToProjectArea(event: MapMouseEvent) {
    const projectAreaId = this.getProjectAreaIdFromFeatures(event.point);
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
    const hoveredProjectAreaId = this.getProjectAreaIdFromFeatures(e.point);
    if (hoveredProjectAreaId) {
      this.hoveredProjectAreaId$.next(hoveredProjectAreaId);
    }
    this.mouseLngLat = e.lngLat;
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
}

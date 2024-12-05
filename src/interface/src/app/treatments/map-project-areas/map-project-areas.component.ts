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
  map,
  BehaviorSubject,
} from 'rxjs';
import { MapConfigState } from '../treatment-map/map-config.state';

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
  fillColor!: any;
  getTreatedStandsTotal = getTreatedStandsTotal;

  hoveredProjectAreaId$ = new BehaviorSubject<any>(null);
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
    private mapConfigState: MapConfigState
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
    this.hoveredProjectAreaId$.next(hoveredProjectAreaId);
    this.updateHoveredFillColor(hoveredProjectAreaId);
    this.mouseLngLat = e.lngLat;
  }

  resetCursorAndTooltip(e: MapMouseEvent) {
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.hoveredProjectAreaId$.next(null);
    this.updateHoveredFillColor(null);
    this.mouseLngLat = null;
  }

  private getProjectAreaIdFromFeatures(point: Point): number | null {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0].properties['id'];
  }

  updateHoveredFillColor(projectAreaId: number | null) {
    if (projectAreaId) {
      const baseColor = getColorForProjectPosition(projectAreaId + 6);
      this.hoveredFillColor = this.darkenColor(baseColor, 20);
    } else {
      this.hoveredFillColor = BASE_COLORS['dark'];
    }
  }

  /**
   * Darkens a specified color by a given percentage.
   * @param hexColor The color in hexadecimal format (#RRGGBB).
   * @param percent The percentage by which to darken the color (0-100).
   * @returns The darkened color in hexadecimal format.
   */
  darkenColor(hexColor: string, percent: number): string {
    // Remove the '#' character if present
    hexColor = hexColor.replace('#', '');

    // Convert HEX to RGB
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // Calculate the darkness factor
    const factor = (100 - percent) / 100;

    // Apply the darkness factor to each color channel
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    // Convert back to HEX
    return (
      '#' +
      this.toHex(newR) +
      this.toHex(newG) +
      this.toHex(newB)
    );
  }

  /**
   * Converts a number to a 2-digit HEX format.
   * @param value A number between 0 and 255.
   * @returns A 2-character HEX string.
   */
  private toHex(value: number): string {
    const hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
}

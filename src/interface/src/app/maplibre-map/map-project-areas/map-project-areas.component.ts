import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import type { ExpressionSpecification } from 'maplibre-gl';
import {
  LayerSpecification,
  LngLat,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf } from '@angular/common';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { BASE_COLORS, LABEL_PAINT } from '../../treatments/map.styles';
import { BehaviorSubject, filter, map } from 'rxjs';
import { getColorForProjectPosition } from 'src/app/plan/plan-helpers';
import { MapConfigState } from '../map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ScenarioState } from '../scenario.state';

type MapLayerData = {
  readonly name: string;
  readonly sourceLayer: string;
  paint?: LayerSpecification['paint'];
  color?: string;
};

@UntilDestroy()
@Component({
  selector: 'app-map-project-areas',
  standalone: true,
  imports: [
    LayerComponent,
    VectorSourceComponent,
    MatIconModule,
    NgIf,
    AsyncPipe,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;
  @Input() showHoveredProjectAreas: boolean = true;
  /**
   * If provided we should fill the project areas
   */
  @Input() projectAreasCount: number | null = null;

  @Output() changeHoveredProjectAreaId = new EventEmitter<number | null>();
  @Output() changeMouseLngLat = new EventEmitter<LngLat | null>();
  @Output() selectProjectArea = new EventEmitter<string>();

  private readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

  hoveredProjectAreaId$ = new BehaviorSubject<number | null>(null);
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;
  opacity: number = 0.5;

  paint: LayerSpecification['paint'] = {
    'fill-color': 'transparent',
    'fill-opacity': this.opacity,
  };

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

  scenarioId$ = this.scenarioState.currentScenarioId$.pipe(
    filter((scenarioId) => !!scenarioId),
    map((scenario) => scenario as number)
  );

  vectorLayerUrl$ = this.scenarioId$.pipe(
    map((scenarioId) => {
      return this.martinSource.tilesUrl + `?scenario_id=${scenarioId}`;
    })
  );

  constructor(
    private mapConfigState: MapConfigState,
    private scenarioState: ScenarioState
  ) {}

  ngOnInit(): void {
    if (this.projectAreasCount) {
      this.paint = this.getFillColors();
    }

    this.mapConfigState.projectAreasOpacity$
      .pipe(untilDestroyed(this))
      .subscribe((opacity) => {
        this.opacity = opacity;
        this.paint = { ...this.paint, 'fill-opacity': this.opacity };
      });
  }

  goToProjectArea(event: MapMouseEvent) {
    if (!this.visible) {
      return;
    }
    const projectAreaId = this.getProjectAreaFromFeatures(event.point)
      .properties['id'];
    this.resetCursorAndTooltip();
    this.selectProjectArea.emit(projectAreaId);
  }

  setCursor() {
    if (!this.visible) {
      return;
    }
    this.mapLibreMap.getCanvas().style.cursor = 'pointer';
  }

  setProjectAreaTooltip(e: MapMouseEvent) {
    if (!this.visible) {
      return;
    }
    this.hoveredProjectAreaFromFeatures = this.getProjectAreaFromFeatures(
      e.point
    );
    if (this.hoveredProjectAreaFromFeatures?.properties?.['id']) {
      const id = this.hoveredProjectAreaFromFeatures.properties['id'];
      this.hoveredProjectAreaId$.next(id);
      this.changeHoveredProjectAreaId.emit(id);
    }

    this.changeMouseLngLat.emit(e.lngLat);
  }

  resetCursorAndTooltip() {
    if (!this.visible) {
      return;
    }
    this.mapLibreMap.getCanvas().style.cursor = '';
    this.hoveredProjectAreaFromFeatures = null;
    this.hoveredProjectAreaId$.next(null);
    this.changeHoveredProjectAreaId.emit(null);

    this.changeMouseLngLat.emit(null);
  }

  private getProjectAreaFromFeatures(point: Point): MapGeoJSONFeature {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['map-project-areas-fill'],
    });

    return features[0];
  }

  getFillColors(): LayerSpecification['paint'] {
    const defaultColor = 'transparent';
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'rank'],
    ];
    // If there is no project area count we should not fill
    if (this.projectAreasCount) {
      for (let i = 1; i <= this.projectAreasCount; i++) {
        matchExpression.push(i.toString(), getColorForProjectPosition(i));
      }
    }
    matchExpression.push(defaultColor);

    return {
      'fill-color': matchExpression as ExpressionSpecification,
      'fill-opacity': this.opacity,
    };
  }
}

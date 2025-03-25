import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  LngLat,
  Point,
} from 'maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf } from '@angular/common';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { BASE_COLORS, LABEL_PAINT } from '../../treatments/map.styles';
import { Subject } from 'rxjs';
import { getColorForProjectPosition } from 'src/app/plan/plan-helpers';
import type { ExpressionSpecification } from 'maplibre-gl';
import { MapConfigState } from '../map-config.state';

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
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;
  @Input() showHoveredProjectAreas: boolean = true;
  @Input() scenarioId!: number;
  @Input() opacity: number = 0.5;
  /**
   * If provided we should fill the project areas
   */
  @Input() projectAreasCount: number | null = null;

  @Output() changeHoveredProjectAreaId = new EventEmitter<number | null>();
  @Output() changeMouseLngLat = new EventEmitter<LngLat | null>();
  @Output() selectProjectArea = new EventEmitter<string>();

  private readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

  hoveredProjectAreaId$ = new Subject<number | null>();
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;

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

  constructor(private mapConfigState: MapConfigState) {}

  ngOnInit(): void {
    if (this.projectAreasCount) {
      this.paint = this.getFillColors();
    }

    this.mapConfigState.projectAreaOpacity$.subscribe((opacity) => {
      this.opacity = opacity;
      this.paint = this.getFillColors();
    });
  }

  get vectorLayerUrl() {
    return this.martinSource.tilesUrl + `?scenario_id=${this.scenarioId}`;
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

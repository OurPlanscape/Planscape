import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  Point,
  LngLat,
} from 'maplibre-gl';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf, PercentPipe } from '@angular/common';

import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { BASE_COLORS, LABEL_PAINT } from '../../treatments/map.styles';
import { Subject } from 'rxjs';

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

    PercentPipe,
  ],
  templateUrl: './map-project-areas.component.html',
  styleUrl: './map-project-areas.component.scss',
})
export class MapProjectAreasComponent {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;

  @Input() scenarioId!: number;

  @Output() changeHoveredProjectAreaId = new EventEmitter<number | null>();
  @Output() changeMouseLngLat = new EventEmitter<LngLat | null>();

  private readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

  hoveredProjectAreaId$ = new Subject<number | null>();
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;

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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get vectorLayerUrl() {
    return this.martinSource.tilesUrl + `?scenario_id=${this.scenarioId}`;
  }

  goToProjectArea(event: MapMouseEvent) {
    const projectAreaId = this.getProjectAreaFromFeatures(event.point)
      .properties['id'];
    this.changeMouseLngLat.emit(null);

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
}

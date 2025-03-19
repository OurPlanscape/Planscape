import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf, PercentPipe } from '@angular/common';
import { BASE_COLORS, LABEL_PAINT } from '../../treatments/map.styles';

import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { getProjectAreaFromFeatures } from '../maplibre.helper';

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
  @Input() showTooltips = true;
  // TODO: insted of scenarioId as an input we should get the ID from the scenario state
  @Input() scenarioId!: number | null;
  @Output() mouseLngLat = new EventEmitter();

  @Output() hoveredProjectAreaId = new EventEmitter<number | null>();
  @Output() hoveredProjectAreaFromFeatures = new EventEmitter();
  @Output() setProjectAreaTooltip = new EventEmitter();

  private readonly martinSource = MARTIN_SOURCES.projectAreasByScenario;

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
    const projectAreaId = getProjectAreaFromFeatures(
      this.mapLibreMap,
      event.point
    ).properties['id'];
    this.mouseLngLat.emit(null);

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

  resetCursorAndTooltip() {
    this.mapLibreMap.getCanvas().style.cursor = '';
    // this.hoveredProjectAreaFromFeatures.emit(null);
    // this.hoveredProjectAreaId.next(null);
    // this.mouseLngLat.emit(null);
  }
}

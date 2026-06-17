import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgIf } from '@angular/common';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import { BASE_COLORS, LABEL_PAINT } from '@treatments/map.styles';
import { filter, map, Subject } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ScenarioState } from '@scenario/scenario.state';
import { isPlanningApproachSubUnits } from '@scenario/scenario-helper';
import { PLANNING_APPROACH } from '@types';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { AccountRoutingModule } from '@app/account/account-routing.module';

type MapLayerData = {
  readonly name: string;
  readonly sourceLayer: string;
  paint?: LayerSpecification['paint'];
  color?: string;
};

@UntilDestroy()
@Component({
  selector: 'app-map-multi-project-areas',
  standalone: true,
  imports: [
    LayerComponent,
    VectorSourceComponent,
    MatIconModule,
    NgIf,
    AsyncPipe,
    AccountRoutingModule,
  ],
  templateUrl: './map-multi-project-areas.component.html',
  styleUrl: './map-multi-project-areas.component.scss',
})
export class MapMultiProjectAreasComponent implements OnInit {
  @Input() mapLibreMap!: MapLibreMap;
  @Input() visible = true;
  @Input() showHoveredProjectAreas: boolean = true;
  @Input() allowInteraction = true;
  @Input() projectAreasCount: number | null = null;

  @Input() labelField: 'name' | 'rank' | '' = 'name'; // blank string shows nothing
  @Input() planningApproach: PLANNING_APPROACH = 'OPTIMIZE_PROJECT_AREAS';

  @Output() changeHoveredProjectAreaId = new EventEmitter<number | null>();
  @Output() changeMouseLngLat = new EventEmitter<LngLat | null>();

  private get martinSource() {
    return isPlanningApproachSubUnits(this.planningApproach)
      ? MARTIN_SOURCES.subUnitsByScenario
      : MARTIN_SOURCES.projectAreasByScenario;
  }

  hoveredProjectAreaId$ = new Subject<number | null>();
  hoveredProjectAreaFromFeatures: MapGeoJSONFeature | null = null;
  opacity: number = 0.5;
  scenarioOrigin: 'USER' | 'SYSTEM' | null = null;

  selectedProjectAreas$ = this.mapConfigState.selectedProjectAreas$;

  paint: LayerSpecification['paint'] = {
    'fill-color': 'transparent',
    'fill-opacity': this.opacity,
  };

  get layers(): Record<
    | 'projectAreasOutline'
    | 'projectAreasHighlight'
    | 'projectAreasFill'
    | 'projectAreaLabels',
    MapLayerData
  > {
    return {
      projectAreasOutline: {
        name: 'map-project-areas-line',
        sourceLayer: this.martinSource.sources.geometry,
        color: BASE_COLORS.dark,
      },
      projectAreasHighlight: {
        name: 'map-project-areas-highlight',
        sourceLayer: this.martinSource.sources.geometry,
        color: BASE_COLORS.yellow,
      },
      projectAreasFill: {
        name: 'map-project-areas-fill',
        sourceLayer: this.martinSource.sources.geometry,
        color: BASE_COLORS.almost_white,
      },
      projectAreaLabels: {
        name: 'map-project-areas-labels',
        sourceLayer: this.martinSource.sources.label,
        paint: LABEL_PAINT,
      },
    };
  }

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
    this.mapConfigState.opacity$
      .pipe(untilDestroyed(this))
      .subscribe((opacity) => {
        this.opacity = opacity;
        this.paint = { ...this.paint, 'fill-opacity': this.opacity };
      });

    this.selectedProjectAreas$
      .pipe(untilDestroyed(this))
      .subscribe((selectedIds) => {
        this.updateMapSelectionThickness(selectedIds);
      });

    this.scenarioState.currentScenario$
      .pipe(untilDestroyed(this))
      .subscribe((scenario) => {
        if (scenario.origin) {
          this.scenarioOrigin = scenario.origin;
        }
      });
  }

  private updateMapSelectionThickness(selectedIds: number[] | null) {
    if (
      !this.mapLibreMap ||
      !this.mapLibreMap.getLayer(this.layers.projectAreasOutline.name)
    )
      return;

    const ids = selectedIds || [];
    if (this.scenarioOrigin === 'USER') {
      this.mapLibreMap.setPaintProperty(
        this.layers.projectAreasOutline.name,
        'line-width',
        ['case', ['in', ['get', 'id'], ['literal', ids]], 6, 2]
      );
    } else {
      this.mapLibreMap.setPaintProperty(
        this.layers.projectAreasOutline.name,
        'line-width',
        ['case', ['in', ['get', 'rank'], ['literal', ids]], 6, 2]
      );
    }
  }

  handleLayerClick(event: MapMouseEvent) {
    if (this.allowInteraction === false) {
      return;
    }
    const proj = this.getProjectAreaFromFeatures(event.point);
    let project_identifier = proj.properties['rank'];
    if (this.scenarioOrigin === 'USER') {
      project_identifier = proj.properties['id'];
    }
    this.mapConfigState.toggleSelectedProjectArea(project_identifier);
  }

  setCursor() {
    if (!this.visible) {
      return;
    }
    this.mapLibreMap.getCanvas().style.cursor = 'pointer';
  }

  setProjectAreaTooltip(e: MapMouseEvent) {
    if (!this.visible || !this.allowInteraction) {
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
    if (!this.visible || !this.allowInteraction) {
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
}

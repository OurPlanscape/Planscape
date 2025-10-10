import { Component, Input } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BASE_COLORS } from '../../treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '../../plan/plan.state';
import { map } from 'rxjs';
import { MARTIN_SOURCES } from '../../treatments/map.sources';
import { MapConfigState } from '../map-config.state';
import { FeatureService } from '../../features/feature.service';
import { transition } from '@angular/animations';

@Component({
  selector: 'app-planning-area-layer',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    FeatureComponent,
    GeoJSONSourceComponent,
    LayerComponent,
    VectorSourceComponent,
  ],
  templateUrl: './planning-area-layer.component.html',
})
export class PlanningAreaLayerComponent {
  @Input() before = '';

  opacity$ = this.mapConfigState.opacity$;

  linePaint$ = this.opacity$.pipe(
    map(
      (opacity) =>
        ({
          'line-color': this.lineColor,
          'line-width': 2,
          'line-opacity': 0.8,
          'line-opacity-transition': { duration: 0 },
        }) as any
    )
  );

  constructor(
    private planState: PlanState,
    private mapConfigState: MapConfigState,
    private featureService: FeatureService
  ) {}

  tilesUrl$ = this.planState.currentPlanId$.pipe(
    map((id) => {
      return MARTIN_SOURCES.planningArea.tilesUrl + `?id=${id}`;
    })
  );

  readonly sourceName = MARTIN_SOURCES.planningArea.sources.planningArea;

  readonly lineColor = this.featureService.isFeatureEnabled(
    'DYNAMIC_SCENARIO_MAP'
  )
    ? BASE_COLORS.blue
    : BASE_COLORS.md_gray;
  protected readonly transition = transition;
}

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

  opacity$ = this.mapConfigState.projectAreasOpacity$;

  fillOpacity$ = this.opacity$.pipe(map((opacity) => opacity * 0.2));

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

  readonly backgroundColor = this.featureService.isFeatureEnabled(
    'DYNAMIC_SCENARIO_MAP'
  )
    ? BASE_COLORS.blue
    : BASE_COLORS.white_light_blue;

  readonly lineColor = this.featureService.isFeatureEnabled(
    'DYNAMIC_SCENARIO_MAP'
  )
    ? BASE_COLORS.blue
    : BASE_COLORS.md_gray;
}

import { Component, Input, OnInit } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BASE_COLORS } from '@treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '@plan/plan.state';
import { map } from 'rxjs';
import { MARTIN_SOURCES } from '@treatments/map.sources';

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
export class PlanningAreaLayerComponent implements OnInit {
  @Input() before = '';

  @Input() lineColor: string = BASE_COLORS.blue;

  linePaint = {
    'line-color': this.lineColor,
    'line-width': 2,
    'line-opacity': 0.8,
  } as any;

  constructor(private planState: PlanState) {}

  ngOnInit() {
    this.linePaint['line-color'] = this.lineColor;
  }

  tilesUrl$ = this.planState.currentPlanId$.pipe(
    map((id) => {
      return MARTIN_SOURCES.planningArea.tilesUrl + `?id=${id}`;
    })
  );

  readonly sourceName = MARTIN_SOURCES.planningArea.sources.planningArea;
}

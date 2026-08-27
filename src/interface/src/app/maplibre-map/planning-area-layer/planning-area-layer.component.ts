import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BASE_COLORS } from '@treatments/map.styles';
import { AsyncPipe, NgIf } from '@angular/common';
import { PlanState } from '@plan/plan.state';
import { map, Observable, of } from 'rxjs';
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
export class PlanningAreaLayerComponent implements OnChanges {
  @Input() before = '';

  @Input() lineColor: string = BASE_COLORS.blue;

  @Input() planId: number | null = null;

  /**
   * Shared-link UUID for the public funding report. When set, tiles come from
   * the unauthed shared-link martin function keyed by UUID instead of the plan
   * id in `PlanState` (which the public view has no access to).
   */
  @Input() sharedLinkUuid: string | null = null;

  linePaint = {
    'line-color': this.lineColor,
    'line-width': 2,
    'line-opacity': 0.8,
  } as any;

  constructor(private planState: PlanState) {}

  tilesUrl$!: Observable<string>;

  readonly sourceName = MARTIN_SOURCES.planningArea.sources.planningArea;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['planId'] || changes['sharedLinkUuid']) {
      this.setTilesUrl();
    }
  }

  private setTilesUrl() {
    if (this.planId !== null) {
      this.tilesUrl$ = of(
        `${MARTIN_SOURCES.planningArea.tilesUrl}?id=${this.planId}`
      );
      return;
    }

    if (this.sharedLinkUuid) {
      this.tilesUrl$ = of(
        `${MARTIN_SOURCES.planningAreaByForSharedLink.tilesUrl}?uuid=${this.sharedLinkUuid}`
      );
      return;
    }

    this.tilesUrl$ = this.planState.currentPlanId$.pipe(
      map((id) => `${MARTIN_SOURCES.planningArea.tilesUrl}?id=${id}`)
    );
  }
}

import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import {
  ImageComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';

import { AsyncPipe, NgForOf } from '@angular/common';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { getBoundingBox } from '../maplibre.helper';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { combineLatest, distinctUntilChanged, map, Observable } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  BASE_STANDS_PAINT,
  generatePaintForSequencedStands,
  generatePaintForTreatedStands,
  PROJECT_AREA_OUTLINE_PAINT,
  SELECTED_STANDS_PAINT,
  STANDS_CELL_PAINT,
} from '../map.styles';
import { SEQUENCE_ACTIONS } from '../prescriptions';

type MapLayerData = {
  readonly name: string;
  readonly sourceLayer: string;
  paint?: LayerSpecification['paint'];
  paint$?: Observable<any>;
};

@UntilDestroy()
@Component({
  selector: 'app-map-stands',
  standalone: true,
  imports: [
    LayerComponent,
    VectorSourceComponent,
    AsyncPipe,
    ImageComponent,
    NgForOf,
  ],
  templateUrl: './map-stands.component.html',
})
export class MapStandsComponent implements OnChanges, OnInit {
  /**
   * The instance of mapLibreMap used with this component.
   * Must be provided while using this component.
   */
  @Input() mapLibreMap!: MapLibreMap;
  /**
   * the starting Point of the stand selection while dragging.
   * Null if the user is not dragging to select stands.
   */
  @Input() selectStart!: Point | null;
  /**
   * the end Point of the stand selection while dragging.
   * Null if the user is not dragging to select stands.
   */
  @Input() selectEnd!: Point | null;

  /**
   * The id to be applied on the source vector layer
   */
  @Input() sourceId = 'stands';

  selectedStands$ = this.selectedStandsState.selectedStands$;
  treatedStands$ = this.treatedStandsState.treatedStands$;
  sequenceStandsIds$ = this.treatedStandsState.sequenceStandsIds$;
  /**
   * Reference to the selected stands before the user starts dragging for stand selection
   */
  private initialSelectedStands: number[] = [];
  opacity$ = this.mapConfigState.treatedStandsOpacity$.pipe(
    distinctUntilChanged()
  );

  outlineOpacity$ = combineLatest([
    this.mapConfigState.showTreatmentStandsLayer$.pipe(distinctUntilChanged()),
    this.opacity$,
  ]).pipe(
    map(([visible, opacity]) => {
      const minOutput = visible ? 0.3 : 0;
      const clampedValue = Math.max(0, Math.min(opacity, 1));
      // Perform linear interpolation
      return minOutput + clampedValue * (1 - minOutput);
    })
  );

  // TODO project_area_aggregate only applies when looking at a specific project area
  readonly tilesUrl =
    environment.martin_server +
    'project_area_aggregate,stands_by_tx_plan/{z}/{x}/{y}';

  readonly layers: Record<
    | 'projectAreaOutline'
    | 'standsOutline'
    | 'stands'
    | 'selectedStands'
    | 'sequenceStands',
    MapLayerData
  > = {
    projectAreaOutline: {
      name: 'outline-layer',
      sourceLayer: 'project_area_aggregate',
      paint$: this.outlineOpacity$.pipe(
        map((opacity) => {
          return { ...PROJECT_AREA_OUTLINE_PAINT, 'line-opacity': opacity };
        })
      ),
    },
    standsOutline: {
      name: 'stands-outline-layer',
      sourceLayer: 'stands_by_tx_plan',
      paint$: this.outlineOpacity$.pipe(
        map((opacity) => {
          return { ...STANDS_CELL_PAINT, 'line-opacity': opacity };
        })
      ),
    },
    stands: {
      name: 'stands-layer',
      sourceLayer: 'stands_by_tx_plan',
      paint: BASE_STANDS_PAINT,
    },
    sequenceStands: {
      name: 'stands-sequence-layer',
      sourceLayer: 'stands_by_tx_plan',
      paint: {
        'fill-pattern': 'sequence1',
        'fill-opacity': 1,
      },
    },
    selectedStands: {
      name: 'stands-layer-selected',
      sourceLayer: 'stands_by_tx_plan',
      paint: SELECTED_STANDS_PAINT,
    },
  };

  constructor(
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState
  ) {
    combineLatest([
      this.treatedStands$.pipe(distinctUntilChanged()),
      this.opacity$,
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([treatedStands, opacity]) => {
        this.layers.stands.paint = generatePaintForTreatedStands(
          treatedStands,
          opacity
        );
        this.layers.sequenceStands.paint = generatePaintForSequencedStands(
          treatedStands.filter((stand) => stand.action in SEQUENCE_ACTIONS),
          opacity
        );
      });
  }

  ngOnInit(): void {
    this.selectedStandsState.reset();
  }

  get vectorLayerUrl() {
    const projectAreaId = this.treatmentsState.getProjectAreaId();
    return (
      this.tilesUrl +
      `?treatment_plan_id=${this.treatmentsState.getTreatmentPlanId()}${
        projectAreaId ? `&project_area_id=${projectAreaId}` : ''
      }`
    );
  }

  clickOnStand(event: MapMouseEvent) {
    // do not react to right clicks
    // or disable click if stand selection is not enabled
    if (
      event.originalEvent.button === 2 ||
      !this.mapConfigState.isStandSelectionEnabled()
    ) {
      return;
    }
    const standId = this.getStandIdFromStandsLayer(event.point)[0];
    this.selectedStandsState.toggleStand(standId);
    this.treatmentsState.setShowApplyTreatmentsDialog(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isMouseDownChange(changes['selectStart'])) {
      this.initialSelectedStands = [
        ...this.selectedStandsState.getSelectedStands(),
      ];
      this.selectedStandsState.saveHistory(this.initialSelectedStands);
    }

    // finds selected stands when the select bounding box changes
    if (changes['selectStart'] || changes['selectEnd']) {
      //select stands
      this.selectStandsWithinRectangle();
    }
    // if we end up dragging, show treatment apply dialog
    if (this.isMouseEndEvent(changes['selectEnd'])) {
      this.treatmentsState.setShowApplyTreatmentsDialog(true);
    }
  }

  setCursor() {
    if (this.mapConfigState.isStandSelectionEnabled()) {
      this.mapConfigState.setCursor('pointer');
    }
  }

  resetCursor() {
    this.mapConfigState.resetCursor();
  }

  private isMouseDownChange(change: SimpleChange) {
    return change?.currentValue && !change?.previousValue;
  }

  private isMouseEndEvent(change: SimpleChange) {
    return change?.previousValue && !change?.currentValue;
  }

  private getStandIdFromStandsLayer(
    query: Parameters<typeof this.mapLibreMap.queryRenderedFeatures>[0]
  ): number[] {
    const features = this.mapLibreMap.queryRenderedFeatures(query, {
      layers: [this.layers.stands.name],
    });

    return features.map((feature) => feature.properties['id']);
  }

  private selectStandsWithinRectangle(): void {
    if (!this.selectStart || !this.selectEnd) {
      return;
    }

    const bbox = getBoundingBox(this.selectStart, this.selectEnd);

    const newStands = this.getStandIdFromStandsLayer(bbox).filter(
      // filter out existing stands
      (id) => !this.initialSelectedStands.includes(id)
    );

    // Combine the new stands with the existing ones
    const combinedStands = new Set([
      ...this.initialSelectedStands,
      ...newStands,
    ]);

    // Update the state with the combined array of selected stands
    this.selectedStandsState.updateSelectedStands(Array.from(combinedStands));
  }
}

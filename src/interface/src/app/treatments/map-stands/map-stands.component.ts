import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
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

import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { getBoundingBox } from '../../maplibre-map/maplibre.helper';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { combineLatest, distinctUntilChanged, map, pairwise } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  BASE_STANDS_PAINT,
  generatePaintForSequencedStands,
  generatePaintForTreatedStands,
  PROJECT_AREA_OUTLINE_PAINT,
  SELECTED_STANDS_PAINT,
  STANDS_CELL_PAINT,
} from '../map.styles';
import { PATTERN_NAMES, PatternName, SEQUENCE_ACTIONS } from '../prescriptions';
import { MARTIN_SOURCES } from '../map.sources';

type MapLayerData = {
  readonly name: string;
  readonly sourceLayer: string;
  paint: LayerSpecification['paint'];
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
    NgIf,
  ],
  templateUrl: './map-stands.component.html',
})
export class MapStandsComponent implements OnChanges, OnInit, OnDestroy {
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

  sourceId = 'stands';

  /**
   * Whether or not the user can edit stands on the map
   */
  @Input() userCanEditStands = false;

  @Input() before = '';

  treatedStands$ = this.treatedStandsState.treatedStands$;
  sequenceStandsIds$ = this.treatedStandsState.sequenceStandsIds$;
  projectAreaId$ = this.treatmentsState.projectAreaId$;

  readonly patternNames = PATTERN_NAMES;

  patternLoaded: Record<PatternName, boolean> = {
    'stripes-black': false,
    'stripes-red': false,
    'stripes-purple': false,
  };

  allPatternsLoaded() {
    return (
      this.patternLoaded['stripes-purple'] &&
      this.patternLoaded['stripes-black'] &&
      this.patternLoaded['stripes-red']
    );
  }

  @Output() standsLoaded = new EventEmitter();

  /**
   * Reference to the selected stands before the user starts dragging for stand selection
   */
  private initialSelectedStands: number[] = [];
  opacity$ = this.mapConfigState.treatedStandsOpacity$.pipe(
    distinctUntilChanged()
  );

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
      paint: PROJECT_AREA_OUTLINE_PAINT,
    },
    standsOutline: {
      name: 'stands-outline-layer',
      sourceLayer: MARTIN_SOURCES.standsByTxPlan.sources.standsByTxPlan,
      paint: STANDS_CELL_PAINT,
    },
    stands: {
      name: 'stands-layer',
      sourceLayer: MARTIN_SOURCES.standsByTxPlan.sources.standsByTxPlan,
      paint: BASE_STANDS_PAINT,
    },
    sequenceStands: {
      name: 'stands-sequence-layer',
      sourceLayer: MARTIN_SOURCES.standsByTxPlan.sources.standsByTxPlan,
      paint: {
        'fill-pattern': 'sequence1',
        'fill-opacity': 1,
      },
    },
    selectedStands: {
      name: 'stands-layer-selected',
      sourceLayer: MARTIN_SOURCES.standsByTxPlan.sources.standsByTxPlan,
      paint: SELECTED_STANDS_PAINT as any,
    },
  };

  projectAreaFilter$ = this.projectAreaId$.pipe(
    map((id) => {
      if (!id) {
        return undefined;
      }
      return ['==', ['get', 'project_area_id'], id] as any;
    })
  );

  combinedFilter$ = combineLatest([
    this.sequenceStandsIds$,
    this.projectAreaId$,
  ]).pipe(
    map(([ids, projectAreaId]) => {
      const subfilters: any[] = [];
      subfilters.push(['in', ['get', 'id'], ['literal', ids]]);

      if (projectAreaId) {
        subfilters.push(['==', ['get', 'project_area_id'], projectAreaId]);
      }

      return ['all', ...subfilters] as any;
    })
  );

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

    this.selectedStandsState.selectedStands$
      .pipe(pairwise(), untilDestroyed(this))
      .subscribe(([previousIds, currentIds]) => {
        const previousSet = new Set(previousIds);
        const currentSet = new Set(currentIds);

        // find and remove selection on previous stands
        previousIds.forEach((id) => {
          if (!currentSet.has(id)) {
            this.deselectStand(id);
          }
        });

        // add selection on new stands
        currentIds.forEach((id) => {
          if (!previousSet.has(id)) {
            this.selectStand(id);
          }
        });
      });
  }

  ngOnInit(): void {
    this.selectedStandsState.reset();
    this.mapLibreMap.on('data', this.onDataListener);
  }

  private onDataListener = (event: any) => {
    if (
      event.sourceId === 'stands' &&
      event.isSourceLoaded &&
      !event.sourceDataType
    ) {
      this.standsLoaded.emit();
    }
  };

  get vectorLayerUrl() {
    return (
      MARTIN_SOURCES.standsByTxPlan.tilesUrl +
      `?treatment_plan_id=${this.treatmentsState.getTreatmentPlanId()}`
    );
  }

  get aggregateLayerUrl() {
    const projectAreaId = this.treatmentsState.getProjectAreaId();
    return (
      MARTIN_SOURCES.projectAreaAggregate.tilesUrl +
      `?treatment_plan_id=${this.treatmentsState.getTreatmentPlanId()}${
        projectAreaId ? `&project_area_id=${projectAreaId}` : ''
      }`
    );
  }

  clickOnStand(event: MapMouseEvent) {
    // do not react to right clicks
    // or disable click if stand selection is not enabled
    // or disable if user doesn't have permission to apply treatments
    if (
      !this.userCanEditStands ||
      event.originalEvent.button === 2 ||
      !this.mapConfigState.isStandSelectionEnabled()
    ) {
      return;
    }
    const standId = this.getStandIdFromStandsLayer(event.point)[0];
    this.selectedStandsState.toggleStand(standId);
  }

  layerClick() {
    if (this.mapConfigState.isStandSelectionEnabled()) {
      this.treatmentsState.setShowApplyTreatmentsDialog(true);
    }
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
    if (
      this.isMouseEndEvent(changes['selectEnd']) &&
      this.selectedStandsState.getSelectedStands().length > 0
    ) {
      // Defer with a microtask to schedule a new check
      Promise.resolve().then(() =>
        this.treatmentsState.setShowApplyTreatmentsDialog(true)
      );
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
    if (newStands.length === 0) {
      return;
    }

    // Combine the new stands with the existing ones
    const combinedStands = new Set([
      ...this.initialSelectedStands,
      ...newStands,
    ]);

    // Update the state with the combined array of selected stands
    this.selectedStandsState.updateSelectedStands(Array.from(combinedStands));
  }

  private deselectStand(id: number) {
    this.mapLibreMap.removeFeatureState(
      {
        source: 'stands',
        sourceLayer: this.layers.stands.sourceLayer,
        id: id,
      },
      'selected'
    );
  }

  private selectStand(id: number) {
    this.mapLibreMap.setFeatureState(
      {
        source: 'stands',
        sourceLayer: this.layers.stands.sourceLayer,
        id: id,
      },
      { selected: true }
    );
  }

  ngOnDestroy(): void {
    this.mapLibreMap.off('data', this.onDataListener);
  }
}

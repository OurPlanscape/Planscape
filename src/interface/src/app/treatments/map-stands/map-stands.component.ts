import {
  Component,
  Input,
  OnChanges,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';

import { AsyncPipe } from '@angular/common';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { getBoundingBox } from '../maplibre.helper';
import { environment } from '../../../environments/environment';
import { PrescriptionSingleAction, SEQUENCE_COLORS } from '../prescriptions';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../treatment-map/map-config.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatedStand } from '@types';
import { distinctUntilChanged } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-map-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent, AsyncPipe],
  templateUrl: './map-stands.component.html',
})
export class MapStandsComponent implements OnChanges {
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
  /**
   * Reference to the selected stands before the user starts dragging for stand selection
   */
  private initialSelectedStands: number[] = [];

  // TODO project_area_aggregate only applies when looking at a specific project area
  readonly tilesUrl =
    environment.martin_server +
    'project_area_aggregate,stands_by_tx_plan/{z}/{x}/{y}';

  readonly layers = {
    outline: {
      name: 'outline-layer',
      sourceLayer: 'project_area_aggregate',
    },
    stands: {
      name: 'stands-layer',
      sourceLayer: 'stands_by_tx_plan',
    },
    selectedStands: {
      name: 'stands-layer-selected',
      sourceLayer: 'stands_by_tx_plan',
    },
  };

  paint: LayerSpecification['paint'] = {
    'fill-outline-color': '#000',
    'fill-color': '#00000050',
    'fill-opacity': 0.5,
  };

  constructor(
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState
  ) {
    this.treatedStands$
      .pipe(distinctUntilChanged(), untilDestroyed(this))
      .subscribe((treatedStands) => {
        this.paint = {
          'fill-outline-color': '#000',
          'fill-color': this.generateFillColors(treatedStands) as any,
          'fill-opacity': 0.5,
        };
      });
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

  private generateFillColors(stands: TreatedStand[]) {
    const defaultColor = '#00000050';
    if (stands.length === 0) {
      return defaultColor;
    }
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'id'],
    ];

    stands.forEach((stand) => {
      matchExpression.push(
        stand.id,
        SEQUENCE_COLORS[stand.action as PrescriptionSingleAction]
      );
    });
    matchExpression.push(defaultColor);

    return matchExpression;
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

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
  @Input() mapLibreMap!: MapLibreMap;
  @Input() selectStart!: Point | null;
  @Input() selectEnd!: Point | null;

  selectedStands$ = this.selectedStandsState.selectedStands$;
  treatedStands$ = this.treatedStandsState.treatedStands$;
  private initialSelectedStands: number[] = [];

  // TODO project_area_aggregate only applies when looking at a specific project area
  readonly tilesUrl =
    environment.martin_server +
    'project_area_aggregate,stands_by_tx_plan/{z}/{x}/{y}';

  readonly layers = {
    outline: 'outline-layer',
    stands: 'stands-layer',
    selectedStands: 'stands-layer-selected',
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

  private updateSelectedStands(selectedStands: number[]) {
    this.selectedStandsState.updateSelectedStands(selectedStands);
  }

  clickOnLayer(event: MapMouseEvent) {
    // do not react to right clicks
    if (
      event.originalEvent.button === 2 ||
      !this.mapConfigState.isStandSelectionEnabled()
    ) {
      return;
    }

    const features = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: [this.layers.stands],
    });

    const standId = features[0].properties['id'];
    this.selectedStandsState.toggleStand(standId);
  }

  paint: LayerSpecification['paint'] = {
    'fill-outline-color': '#000',
    'fill-color': '#00000050',
    'fill-opacity': 0.5,
  };

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

  selectStandsWithinRectangle(): void {
    if (!this.selectStart || !this.selectEnd) {
      return;
    }
    const newStands: number[] = [];
    const bbox = getBoundingBox(this.selectStart, this.selectEnd);
    const features = this.mapLibreMap.queryRenderedFeatures(bbox, {
      layers: [this.layers.stands],
    });

    let id: any;
    features.forEach((feature) => {
      id = feature.properties['id'];
      const stand = this.initialSelectedStands.find((sId) => sId === id);
      if (stand) {
      } else {
        newStands.push(id);
      }
    });

    const combinedStands = new Set([
      ...this.initialSelectedStands,
      ...newStands,
    ]);

    this.updateSelectedStands(Array.from(combinedStands));
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
}

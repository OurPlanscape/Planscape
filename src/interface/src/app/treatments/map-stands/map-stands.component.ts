import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
import { TreatedStand } from '@services/treatments.service';
import { PrescriptionAction, SEQUENCE_COLORS } from '../prescriptions';
import { TreatmentsState } from '../treatments.state';

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
  @Input() treatedStands: TreatedStand[] = [];

  treatmentPlanId = this.treatmentsState.getTreatmentPlanId();
  projectAreaId = this.treatmentsState.getProjectAreaId();

  selectedStands$ = this.selectedStandsState.selectedStands$;
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
    private treatmentsState: TreatmentsState
  ) {}

  get vectorLayerUrl() {
    return (
      this.tilesUrl +
      `?treatment_plan_id=${this.treatmentPlanId}${
        this.projectAreaId ? `&project_area_id=${this.projectAreaId}` : ''
      }`
    );
  }

  private updateSelectedStands(selectedStands: number[]) {
    this.selectedStandsState.updateSelectedStands(selectedStands);
  }

  clickOnLayer(event: MapMouseEvent) {
    // do not react to right clicks
    if (event.originalEvent.button === 2) {
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
    'fill-color': this.getFillColors() as any,
    'fill-opacity': 0.5,
  };

  getFillColors() {
    const defaultColor = '#00000050';
    if (this.treatedStands.length === 0) {
      return defaultColor;
    }
    const matchExpression: (number | string | string[])[] = [
      'match',
      ['get', 'id'],
    ];

    this.treatedStands.forEach((stand) => {
      matchExpression.push(
        stand.id,
        SEQUENCE_COLORS[stand.action as PrescriptionAction]
      );
    });
    matchExpression.push(defaultColor);

    return matchExpression;
  }

  selectStandsWithinRectangle(): void {
    if (!this.selectStart || !this.selectEnd) {
      this.initialSelectedStands = [
        ...this.selectedStandsState.getSelectedStands(),
      ];
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
    // update map colors when the treatedStands change
    if (changes['treatedStands']) {
      // update map filter
      this.paint = {
        'fill-outline-color': '#000',
        'fill-color': this.getFillColors() as any,
        'fill-opacity': 0.5,
      };
    }
    // finds selected stands when the select bounding box changes
    if (changes['selectStart'] || changes['selectEnd']) {
      //select stands
      this.selectStandsWithinRectangle();
    }
  }
}

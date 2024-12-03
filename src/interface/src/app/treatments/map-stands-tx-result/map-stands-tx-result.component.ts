import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import {
  LayerComponent,
  PopupComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LngLat,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';
import { SINGLE_STAND_SELECTED, STANDS_CELL_PAINT } from '../map.styles';
import { environment } from '../../../environments/environment';
import { DEFAULT_SLOT, MapMetricSlot, SLOT_PALETTES } from '../metrics';
import { map } from 'rxjs';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { filter } from 'rxjs/operators';
import { nameForAction } from '../prescriptions';

@Component({
  selector: 'app-map-stands-tx-result',
  standalone: true,
  imports: [
    AsyncPipe,
    LayerComponent,
    VectorSourceComponent,
    PopupComponent,
    NgIf,
  ],
  templateUrl: './map-stands-tx-result.component.html',
  styleUrl: './map-stands-tx-result.component.scss',
})
export class MapStandsTxResultComponent implements OnInit {
  /**
   * The instance of mapLibreMap used with this component.
   * Must be provided while using this component.
   */
  @Input() mapLibreMap!: MapLibreMap;
  @Input() propertyName!: string;

  readonly STANDS_CELL_PAINT = STANDS_CELL_PAINT;
  readonly STAND_SELECTED_PAINT = SINGLE_STAND_SELECTED;
  paint = {};

  constructor(
    private treatmentsState: TreatmentsState,
    private directImpactsStateService: DirectImpactsStateService
  ) {
    this.directImpactsStateService.activeMetric$.pipe().subscribe((m) => {
      this.paint = this.generatePaint(m.slot);
    });
  }

  vectorLayer$ = this.directImpactsStateService.activeMetric$.pipe(
    map((mapMetric) => {
      const plan = this.treatmentsState.getTreatmentPlanId();
      return (
        environment.martin_server +
        `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${mapMetric.metric.id}`
      );
    })
  );

  activeStand$ = this.directImpactsStateService.activeStand$;

  activeStandId$ = this.activeStand$.pipe(
    filter((s): s is MapGeoJSONFeature => s !== null),
    map((stand) => stand.id)
  );

  setActiveStand(event: MapMouseEvent) {
    const feature = this.getMapGeoJSONFeature(event.point);
    this.directImpactsStateService.setActiveStand(feature);
    this.hideTooltip();
  }

  ngOnInit(): void {
    this.paint = this.generatePaint(DEFAULT_SLOT);
  }

  tooltipLongLat: null | LngLat = null;
  appliedTreatment = '';

  showTooltip(event: MapMouseEvent) {
    const feature = this.getMapGeoJSONFeature(event.point);
    // const coordinates = centroid(feature).geometry.coordinates;
    this.tooltipLongLat = event.lngLat;
    this.appliedTreatment = nameForAction(feature.properties['action']);
  }

  hideTooltip() {
    this.tooltipLongLat = null;
  }

  private getMapGeoJSONFeature(point: Point) {
    const features = this.mapLibreMap.queryRenderedFeatures(point, {
      layers: ['standsFill'],
    });
    return features[0];
  }

  private generatePaint(slot: MapMetricSlot) {
    return {
      'fill-color': [
        'case',
        ['==', ['get', this.propertyName], ['literal', null]], // Explicitly typing null
        '#ffffff', // White for null values
        [
          'interpolate',
          ['linear'],
          ['get', this.propertyName],
          ...this.getPallete(slot),
        ],
      ] as DataDrivenPropertyValueSpecification<ColorSpecification>,
      'fill-opacity': 0.8,
    };
  }

  private getPallete(slot: MapMetricSlot) {
    const palette = SLOT_PALETTES[slot];
    return [
      -1,
      palette[0],
      -0.5,
      palette[1],
      0,
      palette[2],
      0.5,
      palette[3],
      1,
      palette[4],
    ];
  }
}

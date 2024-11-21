import { Component, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { STANDS_CELL_PAINT } from '../map.styles';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';
import { DEFAULT_SLOT, MapMetricSlot, SLOT_PALETTES } from '../metrics';
import { map } from 'rxjs';

@Component({
  selector: 'app-map-stands-tx-result',
  standalone: true,
  imports: [AsyncPipe, LayerComponent, VectorSourceComponent],
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
  paint = {};

  constructor(private treatmentsState: TreatmentsState) {
    this.treatmentsState.activeMetric$.pipe().subscribe((m) => {
      this.paint = this.generatePaint(m.slot);
    });
  }

  vectorLayer$ = this.treatmentsState.activeMetric$.pipe(
    map((mapMetric) => {
      const plan = this.treatmentsState.getTreatmentPlanId();
      return (
        environment.martin_server +
        `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${mapMetric.metric.id}`
      );
    })
  );

  ngOnInit(): void {
    this.paint = this.generatePaint(DEFAULT_SLOT);
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
    // INVERSE ORDER
    return [
      -1,
      palette[4],
      -0.5,
      palette[3],
      0,
      palette[2],
      0.5,
      palette[1],
      1,
      palette[0],
    ];
  }
}

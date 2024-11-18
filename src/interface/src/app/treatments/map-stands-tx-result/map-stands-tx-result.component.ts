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
  MapMouseEvent,
} from 'maplibre-gl';
import { STANDS_CELL_PAINT } from '../map.styles';
import { environment } from '../../../environments/environment';
import { TreatmentsState } from '../treatments.state';

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

  paint = {};

  constructor(private treatmentsState: TreatmentsState) {}

  readonly url =
    'stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=152&variable=TOTAL_CARBON';

  readonly STANDS_CELL_PAINT = STANDS_CELL_PAINT;

  get vectorLayerUrl() {
    // TODO dynamic
    const variable = 'TOTAL_CARBON';
    const plan = this.treatmentsState.getTreatmentPlanId();
    return (
      environment.martin_server +
      `stands_by_tx_result/{z}/{x}/{y}?treatment_plan_id=${plan}&variable=${variable}`
    );
  }

  clickLayer(event: MapMouseEvent) {
    const d = this.mapLibreMap.queryRenderedFeatures(event.point, {
      layers: ['standsFill'],
    });
    console.log(d);
  }

  ngOnInit(): void {
    console.log(this.propertyName);
    this.paint = {
      'fill-color': [
        'case',
        ['==', ['get', this.propertyName], ['literal', null]], // Explicitly typing null
        '#ffffff', // White for null values
        [
          'interpolate',
          ['linear'],
          ['get', this.propertyName],
          -1,
          'hsl(200,61%,72%)', // Light blue for low values
          1,
          'hsl(200,93%,18%)', // Dark blue for high values
        ],
      ] as DataDrivenPropertyValueSpecification<ColorSpecification>,
    };
  }
}

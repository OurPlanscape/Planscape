import { Component, Input } from '@angular/core';

import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  Map,
  MapViewOptions,
} from '@types';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-map-config-summary',
  templateUrl: './map-config-summary.component.html',
  styleUrls: ['./map-config-summary.component.scss'],
})
export class MapConfigSummaryComponent {
  @Input() boundaryConfig: BoundaryConfig[] | null = null;
  @Input() conditionsConfig$!: Observable<ConditionsConfig | null>;
  @Input() mapHasDataLayer: boolean | null = false;
  @Input() maps: Map[] = [];
  @Input() mapViewOptions: MapViewOptions | null = null;

  readonly BaseLayerType = BaseLayerType;
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  Legend,
  NONE_BOUNDARY_CONFIG,
} from 'src/app/types';

import { Map, MapViewOptions } from './../../types/map.types';

@Component({
  selector: 'app-map-control-panel',
  templateUrl: './map-control-panel.component.html',
  styleUrls: ['./map-control-panel.component.scss'],
})
export class MapControlPanelComponent implements OnInit {
  @Input() boundaryConfig: BoundaryConfig[] | null = null;
  @Input() conditionsConfig$!: Observable<ConditionsConfig | null>;
  @Input() loadingIndicators: { [layerName: string]: boolean } = {};
  @Input() mapHasDataLayer: boolean | null = false;
  @Input() maps: Map[] = [];
  @Input() mapViewOptions: MapViewOptions | null = null;
  @Input() selectedMapOpacity?: number | null = null;

  @Output() changeBaseLayer = new EventEmitter<Map>();
  @Output() changeBoundaryLayer = new EventEmitter<Map>();
  @Output() changeConditionLayer = new EventEmitter<Map>();
  @Output() changeMapCount = new EventEmitter<number>();
  @Output() changeOpacity = new EventEmitter<number>();
  @Output() selectMap = new EventEmitter<number>();
  @Output() toggleExistingProjectsLayer = new EventEmitter<Map>();

  readonly baseLayerTypes: number[] = [
    BaseLayerType.Road,
    BaseLayerType.Terrain,
    BaseLayerType.Satellite,
  ];
  readonly BaseLayerType = BaseLayerType;

  readonly noneBoundaryConfig = NONE_BOUNDARY_CONFIG;

  constructor() {}

  ngOnInit(): void {}

  /** Gets the legend that should be shown in the sidebar.
   *
   *  WARNING: This function is run constantly and shouldn't do any heavy lifting!
   */
  getSelectedLegend(): Legend | undefined {
    if (this.mapViewOptions) {
      return this.maps[this.mapViewOptions.selectedMapIndex].legend;
    } else {
      return undefined;
    }
  }
}

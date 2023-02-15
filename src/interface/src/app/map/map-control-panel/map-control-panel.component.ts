import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';
import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  Legend,
  NONE_BOUNDARY_CONFIG,
} from 'src/app/types';

import { NONE_DATA_LAYER_CONFIG } from './../../types/data.types';
import { Map, MapViewOptions } from './../../types/map.types';
import { ConditionsNode } from './condition-tree/condition-tree.component';

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
  readonly noneDataLayerConfig = NONE_DATA_LAYER_CONFIG;

  conditionDataRaw$ = new BehaviorSubject<ConditionsNode[]>([]);
  conditionDataNormalized$ = new BehaviorSubject<ConditionsNode[]>([]);

  constructor() {}

  ngOnInit(): void {
    this.conditionsConfig$
      .pipe(
        filter((config) => !!config),
        map((config) => this.conditionsConfigToDataRaw(config!))
      )
      .subscribe((data) => {
        this.conditionDataRaw$.next(data);
      });
    this.conditionsConfig$
      .pipe(
        filter((config) => !!config),
        map((config) => this.conditionsConfigToDataNormalized(config!))
      )
      .subscribe((data) => {
        this.conditionDataNormalized$.next(data);
      });
  }

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

  private conditionsConfigToDataRaw(
    config: ConditionsConfig
  ): ConditionsNode[] {
    return config.pillars
      ? config.pillars
          ?.filter((pillar) => pillar.display)
          .map((pillar): ConditionsNode => {
            return {
              ...pillar,
              disableSelect: true,
              children: pillar.elements?.map((element): ConditionsNode => {
                return {
                  ...element,
                  disableSelect: true,
                  children: element.metrics,
                };
              }),
            };
          })
      : [];
  }

  private conditionsConfigToDataNormalized(
    config: ConditionsConfig
  ): ConditionsNode[] {
    return config.pillars
      ? config.pillars
          ?.filter((pillar) => pillar.display)
          .map((pillar): ConditionsNode => {
            return {
              ...pillar,
              filepath: pillar.filepath?.concat('_normalized'),
              normalized: true,
              children: pillar.elements?.map((element): ConditionsNode => {
                return {
                  ...element,
                  filepath: element.filepath?.concat('_normalized'),
                  normalized: true,
                  children: element.metrics?.map((metric): ConditionsNode => {
                    return {
                      ...metric,
                      filepath: metric.filepath?.concat('_normalized'),
                      normalized: true,
                      min_value: undefined,
                      max_value: undefined,
                    };
                  }),
                };
              }),
            };
          })
      : [];
  }
}

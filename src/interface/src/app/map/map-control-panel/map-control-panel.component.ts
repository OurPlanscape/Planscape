import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
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
import {
  ConditionsNode,
  ConditionTreeComponent,
} from './condition-tree/condition-tree.component';

import { BackendConstants } from './../../backend-constants';

/** Map Legend Display Strings */
  const CURRENT_CONDITIONS_RAW_LEGEND = "Current Condition (Raw)";
  const CURRENT_CONDITIONS_NORMALIZED_LEGEND = "Current Condition (Normalized)";
  const FUTURE_CONDITIONS_LEGEND = "Future Climate Stability (Normalized)";

@Component({
  selector: 'app-map-control-panel',
  templateUrl: './map-control-panel.component.html',
  styleUrls: ['./map-control-panel.component.scss'],
})
export class MapControlPanelComponent implements OnInit {
  @ViewChildren(ConditionTreeComponent)
  conditionTrees?: QueryList<ConditionTreeComponent>;

  @Input() boundaryConfig: BoundaryConfig[] | null = null;
  @Input() conditionsConfig$!: Observable<ConditionsConfig | null>;
  @Input() loadingIndicators: { [layerName: string]: boolean } = {};
  @Input() mapHasDataLayer: boolean | null = false;
  @Input() maps: Map[] = [];
  @Input() mapViewOptions: MapViewOptions | null = null;
  @Input() selectedMap?: Map | null;
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
  conditionDataFuture$ = new BehaviorSubject<ConditionsNode[]>([]);

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
    this.conditionsConfig$
      .pipe(
        filter((config) => !!config),
        map((config) => this.conditionsConfigToDataFuture(config!))
      )
      .subscribe((data) => {
        this.conditionDataFuture$.next(data);
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

  enableClearAllButton(map: Map): boolean {
    return (
      map.config.boundaryLayerConfig !== NONE_BOUNDARY_CONFIG ||
      map.config.showExistingProjectsLayer ||
      map.config.dataLayerConfig !== NONE_DATA_LAYER_CONFIG
    );
  }

  clearAll(map: Map): void {
    map.config.boundaryLayerConfig = NONE_BOUNDARY_CONFIG;
    this.changeBoundaryLayer.emit(map);
    map.config.showExistingProjectsLayer = false;
    this.toggleExistingProjectsLayer.emit(map);
    map.config.dataLayerConfig = NONE_DATA_LAYER_CONFIG;
    this.changeConditionLayer.emit(map);
  }

  unstyleConditionTree(index: number): void {
    this.conditionTrees?.get(index)?.unstyleAndDeselectAllNodes();
  }

  /** Raw data is selectable only at the metric level.
   */
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
              disableInfoCard: true,
              legend_name: CURRENT_CONDITIONS_RAW_LEGEND,
              children: pillar.elements
                ?.filter((element) => element.display)
                .map((element): ConditionsNode => {
                  return {
                    ...element,
                    disableSelect: true,
                    disableInfoCard: true,
                    legend_name: CURRENT_CONDITIONS_RAW_LEGEND,
                    children: element.metrics?.map((metric): ConditionsNode=> {
                      return {
                        ...metric,
                        layer:metric.raw_layer,
                        legend_name: CURRENT_CONDITIONS_RAW_LEGEND,
                        data_download_link: metric.raw_data_download_path ?
	                      BackendConstants.DOWNLOAD_END_POINT + '/' + metric.raw_data_download_path :
                        metric.data_download_link,
                      };
                    }),
                  };
                }),
            };
          })
      : [];
  }
  

  /** Normalized configs are selectable at every level (pillar, element, metric).
   */
  private conditionsConfigToDataNormalized(
    config: ConditionsConfig
  ): ConditionsNode[] {
    return config.pillars
      ? config.pillars
          ?.filter((pillar) => pillar.display)
          .map((pillar): ConditionsNode => {
            return {
              ...pillar,
              layer: pillar.normalized_layer,
              data_download_link: pillar.normalized_data_download_path ?
	              BackendConstants.DOWNLOAD_END_POINT + '/' + pillar.normalized_data_download_path :
                undefined,
              legend_name: CURRENT_CONDITIONS_NORMALIZED_LEGEND,
              normalized: true,
              children: pillar.elements?.map((element): ConditionsNode => {
                return {
                  ...element,
                  layer: element.normalized_layer,
                  data_download_link: element.normalized_data_download_path ?
                  BackendConstants.DOWNLOAD_END_POINT + '/' + element.normalized_data_download_path :
                  undefined,
                  legend_name: CURRENT_CONDITIONS_NORMALIZED_LEGEND,
                  normalized: true,
                  min_value: undefined,
                  max_value: undefined,
                  children: element.metrics?.map((metric): ConditionsNode => {
                    return {
                      ...metric,
                      layer: metric.normalized_layer,
                      data_download_link: metric.normalized_data_download_path ?
	                    BackendConstants.DOWNLOAD_END_POINT + '/' + metric.normalized_data_download_path :
                      metric.data_download_link,
                      legend_name: CURRENT_CONDITIONS_NORMALIZED_LEGEND,
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

  /** Future configs are selectable and viewable only at the pillar level.
   */
  private conditionsConfigToDataFuture(
    config: ConditionsConfig
  ): ConditionsNode[] {
    return config.pillars
      ? config.pillars
        ?.filter((pillar) => pillar.display)
	.map((pillar): ConditionsNode => {
          return {
 	    ...pillar,
            data_download_link: pillar.future_data_download_path ?
	      BackendConstants.DOWNLOAD_END_POINT + '/' + pillar.future_data_download_path :
              pillar.data_download_link,
            layer: pillar.future_layer,
            legend_name: FUTURE_CONDITIONS_LEGEND,
            normalized: true,
            children: []
	  };
        })
    : [];
  }

}

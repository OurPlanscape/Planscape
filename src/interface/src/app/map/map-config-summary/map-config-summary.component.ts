import {
  Component,
  Input,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { ConditionTreeComponent } from '../map-control-panel/condition-tree/condition-tree.component';
import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  ConditionTreeType,
  Map,
  MapViewOptions,
  NONE_BOUNDARY_CONFIG,
  NONE_DATA_LAYER_CONFIG,
} from '../../types';
import { Observable, Subject, takeUntil } from 'rxjs';
import features from '../../features/features.json';

@Component({
  selector: 'app-map-config-summary',
  templateUrl: './map-config-summary.component.html',
  styleUrls: ['./map-config-summary.component.scss'],
})
export class MapConfigSummaryComponent implements OnInit {
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

  readonly baseLayerTypes: number[] = [
    BaseLayerType.Road,
    BaseLayerType.Terrain,
    BaseLayerType.Satellite,
  ];
  readonly BaseLayerType = BaseLayerType;

  readonly noneBoundaryConfig = NONE_BOUNDARY_CONFIG;
  readonly noneDataLayerConfig = NONE_DATA_LAYER_CONFIG;

  private readonly destroy$ = new Subject<void>();
  // Region-specific data flags
  rawDataEnabled: boolean | null = null;
  translatedDataEnabled: boolean | null = null;
  futureDataEnabled: boolean | null = null;

  // General data flags
  future_control_panel_enabled = features.show_future_control_panel;
  translated_control_panel_enabled = features.show_translated_control_panel;

  public dataTypeEnum = ConditionTreeType;

  constructor() {}

  ngOnInit(): void {
    this.conditionsConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: ConditionsConfig | null) => {
        this.rawDataEnabled = config?.raw_data!;
        this.translatedDataEnabled = config?.translated_data!;
        this.futureDataEnabled = config?.future_data!;
      });
  }

  enableClearAllButton(map: Map): boolean {
    return (
      map.config.boundaryLayerConfig !== NONE_BOUNDARY_CONFIG ||
      map.config.showExistingProjectsLayer ||
      map.config.dataLayerConfig !== NONE_DATA_LAYER_CONFIG
    );
  }

  unstyleConditionTree(index: number): void {
    this.conditionTrees?.get(index)?.unstyleAndDeselectAllNodes();
  }
}

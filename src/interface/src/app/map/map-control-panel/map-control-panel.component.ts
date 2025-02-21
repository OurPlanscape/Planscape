import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';
import {
  BaseLayerType,
  BoundaryConfig,
  ConditionsConfig,
  ConditionTreeType,
  Map,
  MapViewOptions,
  NONE_BOUNDARY_CONFIG,
  NONE_DATA_LAYER_CONFIG,
} from '@types';
import * as L from 'leaflet';
import { ConditionTreeComponent } from './condition-tree/condition-tree.component';

/** Map Legend Display Strings */

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
  @Input() mapHasDataLayer: boolean | null = false;
  @Input() maps: Map[] = [];
  @Input() mapViewOptions: MapViewOptions | null = null;
  @Input() selectedMap?: Map | null;
  @Input() selectedMapOpacity?: number | null = null;
  @Input() disableRegion = true;

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

  private readonly destroy$ = new Subject<void>();
  // Region-specific data flags
  rawDataEnabled: boolean | null = null;
  translatedDataEnabled: boolean | null = null;
  futureDataEnabled: boolean | null = null;

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

  clearAll(map: Map): void {
    map.config.boundaryLayerConfig = NONE_BOUNDARY_CONFIG;
    this.changeBoundaryLayer.emit(map);
    map.config.showExistingProjectsLayer = false;
    this.toggleExistingProjectsLayer.emit(map);
    map.config.dataLayerConfig = NONE_DATA_LAYER_CONFIG;
    if (map.legend) {
      L.DomUtil.remove(map.legend);
    }
    this.changeConditionLayer.emit(map);
    this.conditionTrees?.forEach((el) => el.unstyleAndDeselectAllNodes());
  }

  unstyleConditionTree(index: number): void {
    this.conditionTrees?.get(index)?.unstyleAndDeselectAllNodes();
  }
}

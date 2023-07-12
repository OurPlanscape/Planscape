import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { BehaviorSubject, Subject, Observable, takeUntil } from 'rxjs';
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


  private readonly destroy$ = new Subject<void>();
  rawDataEnabled: boolean | null = null;
  translatedDataEnabled: boolean | null = null;
  futureDataEnabled: boolean | null = null;

  conditionDataRaw$ = new BehaviorSubject<ConditionsNode[]>([]);
  conditionDataNormalized$ = new BehaviorSubject<ConditionsNode[]>([]);
  conditionDataFuture$ = new BehaviorSubject<ConditionsNode[]>([]);

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
    this.changeConditionLayer.emit(map);
  }

  unstyleConditionTree(index: number): void {
    this.conditionTrees?.get(index)?.unstyleAndDeselectAllNodes();
  }
}


import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { filter, map, Observable } from 'rxjs';
import {
  ConditionsConfig,
  ConditionTreeType,
  DataLayerConfig,
  Map,
  NONE_DATA_LAYER_CONFIG,
} from '@types';
import { BackendConstants } from '../../../backend-constants';

export interface ConditionsNode extends DataLayerConfig {
  children?: ConditionsNode[];
  disableSelect?: boolean; // Node should not include a radio button
  disableInfoCard?: boolean; // Node should not have an info button
}

/** Map Legend Display Strings */
const CURRENT_CONDITIONS_RAW_LEGEND = 'Current Condition (Raw)';
const CURRENT_CONDITIONS_NORMALIZED_LEGEND = 'Current Condition (Normalized)';
const FUTURE_CONDITIONS_LEGEND = 'Future Climate Stability (Normalized)';

interface ConditionFlatNode {
  expandable: boolean;
  level: number;
  condition: ConditionsNode;
  infoMenuOpen?: boolean;
  styleDisabled?: boolean; // Node should be greyed out but still selectable
  styleDescendantSelected?: boolean; // Node should have a dot indicator
}

@Component({
  selector: 'app-condition-tree',
  templateUrl: './condition-tree.component.html',
  styleUrls: ['./condition-tree.component.scss'],
})
export class ConditionTreeComponent implements OnInit {
  @Input() conditionsConfig$!: Observable<ConditionsConfig | null>;
  @Input() header: string = '';
  @Input() dataType!: ConditionTreeType;
  @Input() map!: Map;

  @Output() changeConditionLayer = new EventEmitter<Map>();

  private _transformer = (node: ConditionsNode, level: number) => {
    return {
      expandable: !!node!.children && node!.children.length > 0,
      level: level,
      condition: node,
    };
  };

  treeFlattener = new MatTreeFlattener(
    this._transformer,
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children
  );

  treeControl = new FlatTreeControl<ConditionFlatNode>(
    (node) => node!.level,
    (node) => node!.expandable
  );
  conditionDataSource = new MatTreeFlatDataSource(
    this.treeControl,
    this.treeFlattener
  );

  constructor() {}

  ngOnInit(): void {
    if (this.dataType == ConditionTreeType.RAW) {
      this.conditionsConfig$
        .pipe(
          filter((config) => !!config),
          map((config) => this.conditionsConfigToDataRaw(config!))
        )
        .subscribe((data) => {
          this.conditionDataSource.data = data;
          this.map.config.dataLayerConfig = this.findAndRevealNode(
            this.map.config.dataLayerConfig
          );
        });
    } else if (this.dataType == ConditionTreeType.TRANSLATED) {
      this.conditionsConfig$
        .pipe(
          filter((config) => !!config),
          map((config) => this.conditionsConfigToDataNormalized(config!))
        )
        .subscribe((data) => {
          this.conditionDataSource.data = data;
          this.map.config.dataLayerConfig = this.findAndRevealNode(
            this.map.config.dataLayerConfig
          );
        });
    } else if (this.dataType == ConditionTreeType.FUTURE) {
      this.conditionsConfig$
        .pipe(
          filter((config) => !!config),
          map((config) => this.conditionsConfigToDataFuture(config!))
        )
        .subscribe((data) => {
          this.conditionDataSource.data = data;
          this.map.config.dataLayerConfig = this.findAndRevealNode(
            this.map.config.dataLayerConfig
          );
        });
    }
  }

  /** Used to compute whether a node in the condition layer tree has children. */
  hasChild = (_: number, node: ConditionFlatNode) => node.expandable;

  onSelect(node: ConditionFlatNode): void {
    this.unstyleAndDeselectAllNodes();
    this.styleDescendantsDisabled(node);
    this.styleAncestorsSelected(node);
  }

  /** Unstyles and deselects all nodes. */
  unstyleAndDeselectAllNodes(): void {
    this.treeControl.dataNodes.forEach((dataNode) => {
      dataNode.styleDisabled = false;
      dataNode.styleDescendantSelected = false;
    });
  }

  /** Visually indicates that all the descendants of a condition layer node are
   *  included in the current analysis by setting their style.
   */
  private styleDescendantsDisabled(node: ConditionFlatNode): void {
    this.treeControl.getDescendants(node).forEach((descendant) => {
      descendant.styleDisabled = true;
    });
  }

  /** Find and style all the ancestors of a given node in the tree recursively. */
  private styleAncestorsSelected(node: ConditionFlatNode): void {
    const nodeLevel = node.level;
    const nodeIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    // Iterate over nodes in reverse order starting from the node preceding
    // the given node.
    for (let index = nodeIndex; index >= 0; index--) {
      const currentNode = this.treeControl.dataNodes[index];
      if (currentNode.level < nodeLevel) {
        currentNode.styleDescendantSelected = true;
        this.styleAncestorsSelected(currentNode);
        break;
      }
    }
  }

  /** Find the node matching the given config in the condition tree (if any), and expand its ancestors
   *  so it becomes visible.
   */
  private findAndRevealNode(config: DataLayerConfig): ConditionsNode {
    if (!config.layer || config.layer === NONE_DATA_LAYER_CONFIG.layer)
      return NONE_DATA_LAYER_CONFIG;
    for (let node of this.treeControl.dataNodes) {
      var node_layer = '';
      if (node.condition.region_geoserver_name) {
        node_layer =
          node.condition.region_geoserver_name + node.condition.layer;
      }
      if (node_layer === node.condition.region_geoserver_name + config.layer) {
        this.expandAncestors(node);
        this.onSelect(node);
        return node.condition;
      }
    }
    return config;
  }

  /** Find and expand all the ancestors of a given node in the tree recursively. */
  private expandAncestors(node: ConditionFlatNode): void {
    const nodeLevel = node.level;
    const nodeIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    // Iterate over nodes in reverse order starting from the node preceding
    // the given node.
    for (let index = nodeIndex; index >= 0; index--) {
      const currentNode = this.treeControl.dataNodes[index];
      if (currentNode.level < nodeLevel) {
        this.treeControl.expand(currentNode);
        this.expandAncestors(currentNode);
        break;
      }
    }
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
              normalized: false,
              children: pillar.elements
                ?.filter((element) => element.display)
                .map((element): ConditionsNode => {
                  return {
                    ...element,
                    disableSelect: true,
                    disableInfoCard: true,
                    legend_name: CURRENT_CONDITIONS_RAW_LEGEND,
                    normalized: false,
                    children: element.metrics?.map((metric): ConditionsNode => {
                      return {
                        ...metric,
                        layer: metric.raw_layer,
                        region_geoserver_name: config.region_geoserver_name,
                        legend_name: CURRENT_CONDITIONS_RAW_LEGEND,
                        normalized: false,
                        data_download_link: metric.raw_data_download_path
                          ? BackendConstants.DOWNLOAD_END_POINT +
                            '/' +
                            metric.raw_data_download_path
                          : metric.data_download_link,
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
              region_geoserver_name: config.region_geoserver_name,
              data_download_link: pillar.normalized_data_download_path
                ? BackendConstants.DOWNLOAD_END_POINT +
                  '/' +
                  pillar.normalized_data_download_path
                : undefined,
              legend_name: CURRENT_CONDITIONS_NORMALIZED_LEGEND,
              normalized: true,
              children: pillar.elements?.map((element): ConditionsNode => {
                return {
                  ...element,
                  layer: element.normalized_layer,
                  region_geoserver_name: config.region_geoserver_name,
                  data_download_link: element.normalized_data_download_path
                    ? BackendConstants.DOWNLOAD_END_POINT +
                      '/' +
                      element.normalized_data_download_path
                    : undefined,
                  legend_name: CURRENT_CONDITIONS_NORMALIZED_LEGEND,
                  normalized: true,
                  min_value: undefined,
                  max_value: undefined,
                  children: element.metrics?.map((metric): ConditionsNode => {
                    return {
                      ...metric,
                      layer: metric.normalized_layer,
                      region_geoserver_name: config.region_geoserver_name,
                      data_download_link: metric.normalized_data_download_path
                        ? BackendConstants.DOWNLOAD_END_POINT +
                          '/' +
                          metric.normalized_data_download_path
                        : metric.data_download_link,
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
              data_download_link: pillar.future_data_download_path
                ? BackendConstants.DOWNLOAD_END_POINT +
                  '/' +
                  pillar.future_data_download_path
                : pillar.data_download_link,
              layer: pillar.future_layer,
              region_geoserver_name: config.region_geoserver_name,
              legend_name: FUTURE_CONDITIONS_LEGEND,
              normalized: true,
              children: [],
            };
          })
      : [];
  }
}

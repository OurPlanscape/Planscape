import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { filter, Observable, take } from 'rxjs';
import { DataLayerConfig, Map, NONE_DATA_LAYER_CONFIG } from 'src/app/types';

export interface ConditionsNode extends DataLayerConfig {
  children?: ConditionsNode[];
  disableSelect?: boolean; // Node should not include a radio button
  disableInfoCard?: boolean; // Node should not have an info button
}

interface ConditionFlatNode {
  expandable: boolean;
  level: number;
  condition: ConditionsNode;
  infoMenuOpen?: boolean;
  styleDisabled?: boolean; // Node should be greyed out but still selectable
  styleDescendantSelected?: boolean;  // Node should have a dot indicator
}

@Component({
  selector: 'app-condition-tree',
  templateUrl: './condition-tree.component.html',
  styleUrls: ['./condition-tree.component.scss'],
})
export class ConditionTreeComponent implements OnInit {
  @Input() conditionsData$!: Observable<ConditionsNode[]>;
  @Input() header: string = '';
  @Input() map!: Map;

  @Output() changeConditionLayer = new EventEmitter<Map>();

  private _transformer = (node: ConditionsNode, level: number) => {
    return {
      expandable: !!node.children && node.children.length > 0,
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
    (node) => node.level,
    (node) => node.expandable
  );
  conditionDataSource = new MatTreeFlatDataSource(
    this.treeControl,
    this.treeFlattener
  );

  constructor() {}

  ngOnInit(): void {
    this.conditionsData$
      .pipe(
        filter((data) => data.length > 0),
        take(1)
      )
      .subscribe((data) => {
        this.conditionDataSource.data = data;
        // Ensure the radio button corresponding to the saved selection is selected.
        this.map.config.dataLayerConfig = this.findAndRevealNode(
          this.map.config.dataLayerConfig
        );
      });
  }

  toggleAllLayersOff(): void {
    this.unstyleAndDeselectAllNodes();
    this.map.config.dataLayerConfig = NONE_DATA_LAYER_CONFIG;
    this.changeConditionLayer.emit(this.map);
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
    if (!config.filepath || config.filepath === NONE_DATA_LAYER_CONFIG.filepath)
      return NONE_DATA_LAYER_CONFIG;
    for (let node of this.treeControl.dataNodes) {
      if (node.condition.filepath === config.filepath) {
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
}

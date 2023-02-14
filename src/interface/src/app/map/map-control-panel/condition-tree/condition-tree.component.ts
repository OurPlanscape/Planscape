import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { filter, Observable, take } from 'rxjs';
import { DataLayerConfig, Map, NONE_DATA_LAYER_CONFIG } from 'src/app/types';

export interface ConditionsNode extends DataLayerConfig {
  infoMenuOpen?: boolean;
  disableSelect?: boolean; // Node should not include a radio button
  styleDisabled?: boolean; // Node should be greyed out but still selectable
  children?: ConditionsNode[];
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

  conditionTreeControl = new NestedTreeControl<ConditionsNode>(
    (node) => node.children
  );
  conditionDataSource = new MatTreeNestedDataSource<ConditionsNode>();

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
  hasChild = (_: number, node: ConditionsNode) =>
    !!node.children && node.children.length > 0;

  onSelect(node: ConditionsNode): void {
    this.unstyleAndDeselectAllNodes();
    this.styleDescendantsDisabled(node);
  }

  /** Unstyles and deselects all nodes in the tree using recursion. */
  private unstyleAndDeselectAllNodes(node?: ConditionsNode): void {
    if (!node && this.conditionDataSource.data.length > 0) {
      this.conditionDataSource.data.forEach((node) =>
        this.unstyleAndDeselectAllNodes(node)
      );
    } else if (node) {
      node.styleDisabled = false;
      node.children?.forEach((child) => this.unstyleAndDeselectAllNodes(child));
    }
  }

  /** Visually indicates that all the descendants of a condition layer node are
   *  included in the current analysis by setting their style, using recursion.
   */
  private styleDescendantsDisabled(node: ConditionsNode): void {
    node.children?.forEach((child) => {
      child.styleDisabled = true;
      this.styleDescendantsDisabled(child);
    });
  }

  /** Find the node matching the given config in the condition tree (if any), and expand its ancestors
   *  so it becomes visible.
   */
  private findAndRevealNode(config: DataLayerConfig): ConditionsNode {
    if (!config.filepath || config.filepath === NONE_DATA_LAYER_CONFIG.filepath)
      return NONE_DATA_LAYER_CONFIG;
    for (let pillar of this.conditionDataSource.data) {
      if (pillar.filepath === config.filepath) {
        return pillar;
      }
      if (pillar.children) {
        for (let element of pillar.children) {
          if (element.filepath === config.filepath) {
            this.conditionTreeControl.expand(pillar);
            return element;
          }
          if (element.children) {
            for (let metric of element.children) {
              if (metric.filepath === config.filepath) {
                this.conditionTreeControl.expand(pillar);
                this.conditionTreeControl.expand(element);
                return metric;
              }
            }
          }
        }
      }
    }
    return config;
  }
}

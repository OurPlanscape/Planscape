import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { filter, Observable } from 'rxjs';
import {
  ConditionsConfig,
  DataLayerConfig,
  Map,
  NONE_DATA_LAYER_CONFIG,
} from 'src/app/types';

export interface ConditionsNode extends DataLayerConfig {
  selected?: boolean;
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
  @Input() conditionsConfig$!: Observable<ConditionsConfig | null>;
  @Input() map!: Map;

  @Output() changeConditionLayer = new EventEmitter<Map>();

  conditionTreeControl = new NestedTreeControl<ConditionsNode>(
    (node) => node.children
  );
  conditionDataSource = new MatTreeNestedDataSource<ConditionsNode>();

  constructor() {
    this.conditionDataSource.data = [NONE_DATA_LAYER_CONFIG];
  }

  ngOnInit(): void {
    this.conditionsConfig$
      .pipe(filter((config) => !!config))
      .subscribe((config) => {
        this.conditionDataSource.data = this.conditionsConfigToData(config!);
        // Ensure the radio button corresponding to the saved selection is selected.
        this.map.config.dataLayerConfig = this.findAndRevealNodeWithFilepath(
          this.map.config.dataLayerConfig.filepath
        );
      });
  }

  /** Used to compute whether a node in the condition layer tree has children. */
  hasChild = (_: number, node: ConditionsNode) =>
    !!node.children && node.children.length > 0;

  onSelect(node: ConditionsNode): void {
    this.unstyleAndDeselectAllNodes();
    node.selected = true;
    this.styleDescendantsDisabled(node);
  }

  isNoneNode(node: ConditionsNode): boolean {
    return node === NONE_DATA_LAYER_CONFIG;
  }

  /** Unstyles and deselects all nodes in the tree using recursion. */
  private unstyleAndDeselectAllNodes(node?: ConditionsNode): void {
    if (!node && this.conditionDataSource.data.length > 0) {
      this.conditionDataSource.data.forEach((node) =>
        this.unstyleAndDeselectAllNodes(node)
      );
    } else if (node) {
      node.styleDisabled = false;
      node.selected = false;
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

  private conditionsConfigToData(config: ConditionsConfig): ConditionsNode[] {
    return [
      NONE_DATA_LAYER_CONFIG,
      {
        ...config,
        display_name: 'Current condition',
        disableSelect: true,
        children: config.pillars
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
          }),
      },
      {
        display_name: 'Current condition (normalized)',
        filepath: config.filepath?.concat('_normalized'),
        colormap: config.colormap,
        normalized: true,
        disableSelect: true,
        children: config.pillars
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
          }),
      },
    ];
  }

  /** Find the node matching the given filepath in the condition tree (if any), and expand its ancestors
   *  so it becomes visible.
   */
  private findAndRevealNodeWithFilepath(
    filepath: string | undefined
  ): ConditionsNode {
    if (!filepath || filepath === NONE_DATA_LAYER_CONFIG.filepath)
      return NONE_DATA_LAYER_CONFIG;
    for (let tree of this.conditionDataSource.data) {
      if (tree.filepath === filepath) return tree;
      if (tree.children) {
        for (let pillar of tree.children) {
          if (pillar.filepath === filepath) {
            this.conditionTreeControl.expand(tree);
            return pillar;
          }
          if (pillar.children) {
            for (let element of pillar.children) {
              if (element.filepath === filepath) {
                this.conditionTreeControl.expand(tree);
                this.conditionTreeControl.expand(pillar);
                return element;
              }
              if (element.children) {
                for (let metric of element.children) {
                  if (metric.filepath === filepath) {
                    this.conditionTreeControl.expand(tree);
                    this.conditionTreeControl.expand(pillar);
                    this.conditionTreeControl.expand(element);
                    return metric;
                  }
                }
              }
            }
          }
        }
      }
    }
    return NONE_DATA_LAYER_CONFIG;
  }
}

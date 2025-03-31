import { Component, ElementRef, ViewChild } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { MatTreeModule } from '@angular/material/tree';
import { map, shareReplay, switchMap } from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { NestedTreeControl } from '@angular/cdk/tree';
import { TreeNode } from '../data-layers/tree-node';
import { DataLayer } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatMenuModule } from '@angular/material/menu';
import { DataLayerTooltipComponent } from '../data-layer-tooltip/data-layer-tooltip.component';

@UntilDestroy()
@Component({
  selector: 'app-data-layer-tree',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    MatTreeModule,
    NgIf,
    NgClass,
    MatRadioModule,
    FormsModule,
    MatMenuModule,
    DataLayerTooltipComponent,
  ],
  templateUrl: './data-layer-tree.component.html',
  styleUrl: './data-layer-tree.component.scss',
})
export class DataLayerTreeComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {
    this.dataLayersStateService.paths$
      .pipe(
        untilDestroyed(this),
        switchMap((path) =>
          this.treeData$.pipe(
            map((data) => ({
              path,
              data,
            }))
          )
        )
      )
      .subscribe(({ path, data }) => {
        if (path.length > 0) {
          this.expandNodePath(data, path);
        }
      });
  }

  treeData$ = this.dataLayersStateService.dataTree$.pipe(shareReplay(1));
  selectedDataLayer$ = this.dataLayersStateService.selectedDataLayer$;
  treeControl = new NestedTreeControl<TreeNode>((node) => node.children);

  @ViewChild('treeContainer', { static: false }) treeContainer!: ElementRef;

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }

  private scrollToSelectedNode() {
    if (!this.treeContainer) return;
    const scrollOpts: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'center',
    };

    const selectedButton = this.treeContainer.nativeElement.querySelector(
      '.mat-mdc-radio-checked'
    );

    if (selectedButton) {
      selectedButton.scrollIntoView(scrollOpts);
    } else {
      const allExpanded = this.treeContainer.nativeElement.querySelectorAll(
        '.data-layer-node.expanded'
      );
      const expanded = allExpanded[allExpanded.length - 1];
      if (expanded) {
        expanded.scrollIntoView(scrollOpts);
      }
    }
  }

  expandNodePath(data: TreeNode[] | null, path: string[]) {
    let currentNodes = data;
    let nodeToExpand: TreeNode | undefined;

    for (const name of path) {
      nodeToExpand = currentNodes?.find((node) => node.name === name);
      if (nodeToExpand && nodeToExpand.children) {
        this.treeControl.expand(nodeToExpand);
        currentNodes = nodeToExpand.children;
      } else {
        break;
      }
    }
    // wait until this is rendered (next tick)
    setTimeout(() => this.scrollToSelectedNode(), 0);
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

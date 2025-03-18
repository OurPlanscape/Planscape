import { Component, ElementRef, ViewChild } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { MatTreeModule } from '@angular/material/tree';
import { shareReplay } from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { NestedTreeControl } from '@angular/cdk/tree';
import { TreeNode } from '../data-layers/tree-node';
import { DataLayer } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
  ],
  templateUrl: './data-layer-tree.component.html',
  styleUrl: './data-layer-tree.component.scss',
})
export class DataLayerTreeComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this))
      .subscribe((path) => {
        if (path.length > 0) {
          this.expandNodePath(path);
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

    const selectedButton = this.treeContainer.nativeElement.querySelector(
      '.mat-mdc-radio-checked'
    );

    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  expandNodePath(path: string[]) {
    this.treeData$.subscribe((data) => {
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
      // this.scrollToSelectedNode();
      setTimeout(() => this.scrollToSelectedNode(), 0);
    });

    //
    //
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

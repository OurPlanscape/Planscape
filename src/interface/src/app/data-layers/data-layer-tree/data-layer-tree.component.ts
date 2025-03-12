import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { MatTreeModule } from '@angular/material/tree';
import { shareReplay } from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { NestedTreeControl } from '@angular/cdk/tree';
import { TreeNode } from '../data-layers/tree-node';
import { DataLayer } from '@types';
import { MatRadioModule } from '@angular/material/radio';

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
  ],
  templateUrl: './data-layer-tree.component.html',
  styleUrl: './data-layer-tree.component.scss',
})
export class DataLayerTreeComponent {
  constructor(private dataLayersStateService: DataLayersStateService) {}

  treeData$ = this.dataLayersStateService.dataTree$.pipe(shareReplay(1));

  treeControl = new NestedTreeControl<TreeNode>((node) => node.children);

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

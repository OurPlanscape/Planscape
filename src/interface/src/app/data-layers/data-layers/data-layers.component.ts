import { Component } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { DataItem, DataSet, TreeNode } from '../../types/data-sets';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent, ExpanderSectionComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map, Observable, shareReplay, tap } from 'rxjs';

/**
 * Builds a nested TreeNode structure from an array of DataItems,
 * using each item's `path` array to define the category nesting.
 */
export function buildPathTree(items: DataItem[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const item of items) {
    let currentLevel = root;

    // Walk through each name in the `path` array
    for (const categoryName of item.path) {
      // Try to find an existing node at this level
      let existing = currentLevel.find(
        (node) => node.name === categoryName && !node.item
      );

      // If not found, create a new category node
      if (!existing) {
        existing = { name: categoryName, children: [] };
        currentLevel.push(existing);
      }

      // Descend into the children of this category
      if (!existing.children) {
        existing.children = [];
      }
      currentLevel = existing.children;
    }

    // After walking the path, add a leaf node for the DataItem
    currentLevel.push({ name: item.name, item });
  }

  return root;
}

@Component({
  selector: 'app-data-layers',
  standalone: true,
  imports: [
    NgForOf,
    AsyncPipe,
    MatTreeModule,
    MatIconModule,
    MatCommonModule,
    MatButtonModule,
    NgIf,
    ExpanderSectionComponent,
    NgClass,
    MatProgressSpinnerModule,
    ButtonComponent,
  ],
  templateUrl: './data-layers.component.html',
  styleUrls: ['./data-layers.component.scss'],
})
export class DataLayersComponent {
  constructor(private service: DataLayersService) {}

  noData = false;
  loading = false;

  dataSets$ = this.service.listDataSets().pipe(shareReplay(1));
  treeControl = new NestedTreeControl<TreeNode>((node) => node.children);
  dataSource = new MatTreeNestedDataSource<TreeNode>();
  selectedDataSet: DataSet | null = null;
  treeData$?: Observable<TreeNode[]>;

  viewDatasetCategories(dataSet: DataSet) {
    this.selectedDataSet = dataSet;
    this.loading = true;

    this.treeData$ = this.service.listDataLayers(dataSet.id).pipe(
      tap((items) => {
        this.loading = false;
        this.noData = items.length < 1;
      }),
      map((items) => buildPathTree(items))
    );

    // this.service.listDataLayers(dataSet.id).subscribe((items) => {
    //   const treeData = buildPathTree(items);
    //   if (items.length < 1) {
    //     this.noData = true;
    //   }
    //   this.loading = false;
    //
    //   // Assign the built tree to the data source
    //   this.dataSource.data = treeData;
    // });
  }

  showNode(node: TreeNode) {
    console.log(node);
  }

  goBack() {
    this.selectedDataSet = null;
    this.noData = false;
    this.loading = false;
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

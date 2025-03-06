import { Component } from '@angular/core';
import { DataLayersService } from '@services/data-layers.service';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { DataSet } from '../../types/data-sets';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent, ExpanderSectionComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { buildPathTree, TreeNode } from './tree-node';

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
  }

  goBack() {
    this.selectedDataSet = null;
    this.noData = false;
    this.loading = false;
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

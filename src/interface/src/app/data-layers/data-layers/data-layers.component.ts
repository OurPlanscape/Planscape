import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { DataLayer, DataSet } from '../../types/data-sets';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent, ExpanderSectionComponent } from '@styleguide';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TreeNode } from './tree-node';
import { DataLayersStateService } from '../data-layers.state.service';
import { shareReplay, tap } from 'rxjs';

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
  constructor(private dataLayersStateService: DataLayersStateService) {}

  loading = false;

  dataSets$ = this.dataLayersStateService.dataSets$;
  selectedDataSet$ = this.dataLayersStateService.selectedDataSet$;

  treeControl = new NestedTreeControl<TreeNode>((node) => node.children);

  treeData$ = this.dataLayersStateService.dataTree$.pipe(
    tap((_) => (this.loading = false)),
    shareReplay(1)
  );

  noData$ = this.dataLayersStateService.noTreeData$;

  viewDatasetCategories(dataSet: DataSet) {
    this.dataLayersStateService.selectDataSet(dataSet);
    this.loading = true;
  }

  goBack() {
    this.dataLayersStateService.clearDataSet();
    this.loading = false;
  }

  selectDataLayer(dataLayer: DataLayer) {
    this.dataLayersStateService.selectDataLayer(dataLayer);
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;
}

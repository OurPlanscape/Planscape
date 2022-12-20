import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';

import { Plan } from '../../types';

interface ProgressTask {
  id: number;
  stepNumber?: number;
  taskName: string;
  done: boolean;
  clickable: boolean;
  children?: ProgressTask[];
}

/** Flat node with expandable and level information */
interface ProgressFlatNode {
  expandable: boolean;
  name: string;
  level: number;
  id: number;
  stepNumber?: number;
  clickable: boolean;
  done: boolean;
}

@Component({
  selector: 'progress-panel',
  templateUrl: './progress-panel.component.html',
  styleUrls: ['./progress-panel.component.scss'],
})
export class ProgressPanelComponent implements OnChanges, AfterViewInit {
  @Input() plan: Plan | null = null;
  currentTaskId: number = 3;

  private mapProgressTaskToFlatNode = (
    node: ProgressTask,
    level: number
  ): ProgressFlatNode => {
    const progressFlatNode: ProgressFlatNode = {
      expandable: !!node.children && node.children.length > 0,
      name: node.taskName,
      level: level,
      id: node.id,
      done: node.done,
      clickable: node.clickable,
    };
    if ('stepNumber' in node) {
      progressFlatNode['stepNumber'] = node.stepNumber;
    }
    return progressFlatNode;
  };

  treeControl = new FlatTreeControl<ProgressFlatNode>(
    (node) => node.level,
    (node) => node.expandable
  );

  treeFlattener = new MatTreeFlattener(
    this.mapProgressTaskToFlatNode,
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor() {}

  ngAfterViewInit() {
    this.treeControl.expandAll();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.setProgressList();
  }

  setProgressList() {
    this.dataSource.data = [
      {
        id: 1,
        stepNumber: 1,
        taskName: 'Identify planning area',
        done: true,
        clickable: false,
      },
      {
        id: 2,
        stepNumber: 2,
        taskName: 'Create a Plan',
        done: true,
        clickable: false,
      },
      {
        id: 3,
        stepNumber: 3,
        taskName: 'Create scenarios',
        done: false,
        clickable: false,
        children: [
          {
            id: 4,
            taskName: 'Set priorities',
            done: false,
            clickable: true,
          },
          {
            id: 5,
            taskName: 'Set constraints',
            done: false,
            clickable: true,
          },
          {
            id: 6,
            taskName: 'Explore options',
            done: false,
            clickable: true,
          },
          {
            id: 7,
            taskName: 'Save scenarios',
            done: false,
            clickable: true,
          },
        ],
      },
      {
        id: 8,
        stepNumber: 4,
        taskName: 'Compare scenarios',
        done: false,
        clickable: true,
      },
      {
        id: 9,
        stepNumber: 5,
        taskName: 'Save plan',
        done: false,
        clickable: true,
      },
    ];
  }

  goToStep(node: ProgressFlatNode) {
    console.log('clicked ' + node.name);
    this.currentTaskId = node.id;
  }

  /** Used to compute whether a node in the progress tree has children. */
  hasChild = (_: number, node: ProgressFlatNode) => node.expandable;

  /** Used to compute whether a node is a child. */
  isChild = (node: ProgressFlatNode) => node.level >= 1;
}

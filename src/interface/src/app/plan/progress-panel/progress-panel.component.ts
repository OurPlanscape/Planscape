import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from "@angular/material/tree";

import { Plan } from '../../types';

interface ProgressTask {
  stepNumber?: number;
  taskName: string;
  done: boolean;
  children?: ProgressTask[];
}

/** Flat node with expandable and level information */
interface ProgressFlatNode {
  expandable: boolean;
  stepNumber?: number;
  name: string;
  level: number;
  done: boolean;
}

@Component({
  selector: 'progress-panel',
  templateUrl: './progress-panel.component.html',
  styleUrls: ['./progress-panel.component.scss']
})
export class ProgressPanelComponent implements OnChanges, AfterViewInit {
  @Input()
  plan: Plan | null = null;

  private mapProgressTaskToFlatNode = (node: ProgressTask, level: number): ProgressFlatNode => {
    const progressFlatNode: ProgressFlatNode = {
      expandable: !!node.children && node.children.length > 0,
      name: node.taskName,
      level: level,
      done: node.done,
    };
    if ('stepNumber' in node) {
      progressFlatNode['stepNumber'] = node.stepNumber
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

  dataSource = new MatTreeFlatDataSource(
    this.treeControl, this.treeFlattener);

  progressTaskList: ProgressTask[] = [
      {
        stepNumber: 1,
        taskName: 'Identify planning area',
        done: true,
      },
      {
        stepNumber: 2,
        taskName: 'Create a Plan',
        done: true,
      },
      {
        stepNumber: 3,
        taskName: 'Create scenarios',
        done: false,
        children: [
          {
            taskName: 'Set priorities',
            done: false,
          },
          {
            taskName: 'Set constraints',
            done: false,
          },
          {
            taskName: 'Explore options',
            done: false,
          },
          {
            taskName: 'Save scenarios',
            done: false,
          },
        ]
      },
      {
        stepNumber: 4,
        taskName: 'Compare scenarios',
        done: false,
      },
      {
        stepNumber: 5,
        taskName: 'Save plan',
        done: false,
      }
    ]

  constructor() {}

  ngAfterViewInit() {
    this.treeControl.expandAll();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.setProgressList();
  }

  setProgressList() {
    console.log(this.plan);
    this.dataSource.data = this.progressTaskList;
  }

  trackByTask(_: number, task: ProgressTask) {
    return task.taskName;
  }

  /** Used to compute whether a node in the progress tree has children. */
  hasChild = (_: number, node: ProgressFlatNode) => node.expandable;

  /** Used to compute whether a node is a child. */
  isChild = (node: ProgressFlatNode) => node.level >= 1;

}

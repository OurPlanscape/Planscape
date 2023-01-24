import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';
import { filter } from 'rxjs/operators';

import { MapService } from './../../../services/map.service';
import { ConditionsConfig } from './../../../types/data.types';

// Temporary priorities type
export interface Priorities {
  priorities: string[];
}

interface PriorityRow {
  selected?: boolean;
  visible?: boolean; // Visible as raster data on map
  expanded?: boolean; // Children in table are not hidden
  hidden?: boolean; // Row hidden from table (independent of "visible" attribute)
  conditionName: string;
  score: number;
  filepath: string;
  children: PriorityRow[];
  level: number;
}

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  @Output() changeConditionEvent = new EventEmitter<string>();
  @Output() changePrioritiesEvent = new EventEmitter<Priorities>();

  readonly text1: string = `
    Condition scores represent the condition of each priority within the defined planning area.
    Select at least one priority to create scenarios. Note: Choosing more than 5 may dilute
    the data.
  `;

  displayedColumns: string[] = [
    'selected',
    'visible',
    'conditionName',
    'score',
  ];
  datasource = new MatTableDataSource<PriorityRow>();

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService.conditionsConfig$
      .pipe(
        filter((result) => !!result),
        take(1)
      )
      .subscribe((conditionsConfig) => {
        this.datasource.data = this.conditionsConfigToPriorityData(
          conditionsConfig!
        );
      });
  }

  conditionsConfigToPriorityData(config: ConditionsConfig): PriorityRow[] {
    let data: PriorityRow[] = [];
    config.pillars
      ?.filter((pillar) => pillar.display)
      .forEach((pillar) => {
        let pillarRow: PriorityRow = {
          conditionName: pillar.display_name
            ? pillar.display_name
            : pillar.pillar_name!,
          filepath: pillar.filepath!.concat('_normalized'),
          score: 0,
          children: [],
          level: 0,
          expanded: true,
        };
        data.push(pillarRow);
        pillar.elements?.forEach((element) => {
          let elementRow: PriorityRow = {
            conditionName: element.display_name
              ? element.display_name
              : element.element_name!,
            filepath: element.filepath!.concat('_normalized'),
            score: 0,
            children: [],
            level: 1,
            expanded: true,
          };
          data.push(elementRow);
          pillarRow.children.push(elementRow);
          element.metrics?.forEach((metric) => {
            let metricRow: PriorityRow = {
              conditionName: metric.display_name
                ? metric.display_name
                : metric.metric_name!,
              filepath: metric.filepath!,
              score: 0,
              children: [],
              level: 2,
            };
            data.push(metricRow);
            elementRow.children.push(metricRow);
          });
        });
      });
    return data;
  }

  /** Toggle whether a priority condition's children are expanded. */
  toggleExpand(
    priority: PriorityRow,
    expanded?: boolean,
    hideChildren?: boolean
  ): void {
    priority.expanded = expanded !== undefined ? expanded : !priority.expanded;
    priority.children.forEach((child) => {
      child.hidden = hideChildren !== undefined ? hideChildren : !child.hidden;
      if (child.hidden) {
        this.toggleExpand(child, false, true);
      }
    });
  }

  /** Toggle visibility for a priority condition. If visibility is ON, turn visibility
   *  for all other conditions to OFF.
   */
  toggleVisibility(priority: PriorityRow): void {
    priority.visible = !priority.visible;
    if (priority.visible) {
      this.changeConditionEvent.emit(priority.filepath);
      this.datasource.data.forEach((priorityRow) => {
        if (priorityRow !== priority) {
          priorityRow.visible = false;
        }
      });
    } else {
      this.changeConditionEvent.emit('');
    }
  }

  /** Update the priority list with the user's current selections. */
  updateSelectedPriorities(): void {
    const selectedPriorities: string[] = this.datasource.data
      .filter((row) => row.selected)
      .map((row) => row.conditionName);
    this.changePrioritiesEvent.emit({
      priorities: selectedPriorities,
    });
  }
}

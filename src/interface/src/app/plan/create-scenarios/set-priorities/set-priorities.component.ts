import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';
import { filter } from 'rxjs/operators';

import { MapService } from './../../../services/map.service';
import { ConditionsConfig } from './../../../types/data.types';

interface PriorityRow {
  selected?: boolean;
  visible?: boolean;
  conditionName: string;
  score: number;
  filepath: string;
  children: PriorityRow[];
}

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  @Output() changeConditionEvent = new EventEmitter<string>();

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
    config.pillars?.forEach((pillar) => {
      data.push({
        conditionName: pillar.display_name
          ? pillar.display_name
          : pillar.pillar_name!,
        filepath: pillar.filepath!,
        score: 0,
        children: [],
      });
      pillar.elements?.forEach((element) => {
        data.push({
          conditionName: element.display_name
            ? element.display_name
            : element.element_name!,
          filepath: element.filepath!,
          score: 0,
          children: [],
        });
        element.metrics?.forEach((metric) => {
          data.push({
            conditionName: metric.display_name
              ? metric.display_name
              : metric.metric_name!,
            filepath: metric.filepath!,
            score: 0,
            children: [],
          });
        });
      });
    });
    return data;
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
    }
  }
}

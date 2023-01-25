import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Plan } from 'src/app/types';

import { MapService } from './../../../services/map.service';
import { PlanService } from './../../../services/plan.service';
import { ConditionsConfig } from './../../../types/data.types';
import { PlanConditionScores } from './../../../types/plan.types';

interface PriorityRow {
  selected?: boolean;
  visible?: boolean; // Visible as raster data on map
  expanded?: boolean; // Children in table are not hidden
  hidden?: boolean; // Row hidden from table (independent of "visible" attribute)
  conditionName: string;
  displayName?: string;
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
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Output() changeConditionEvent = new EventEmitter<string>();

  readonly text1: string = `
    Condition scores represent the condition of each priority within the defined planning area.
    Select at least one priority to create scenarios. Note: Choosing more than 5 may dilute
    the data.
  `;

  conditionScores = new Map<string, number>();
  displayedColumns: string[] = ['selected', 'visible', 'displayName', 'score'];
  datasource = new MatTableDataSource<PriorityRow>();

  constructor(
    private mapService: MapService,
    private planService: PlanService
  ) {}

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
    this.plan$.pipe(filter((plan) => !!plan)).subscribe((plan) => {
      this.planService
        .getConditionScoresForPlanningArea(plan!.id)
        .subscribe((response) => {
          this.conditionScores =
            this.convertConditionScoresToDictionary(response);
        });
    });
  }

  private conditionsConfigToPriorityData(
    config: ConditionsConfig
  ): PriorityRow[] {
    let data: PriorityRow[] = [];
    config.pillars
      ?.filter((pillar) => pillar.display)
      .forEach((pillar) => {
        let pillarRow: PriorityRow = {
          conditionName: pillar.pillar_name!,
          displayName: pillar.display_name,
          filepath: pillar.filepath!.concat('_normalized'),
          children: [],
          level: 0,
          expanded: true,
        };
        data.push(pillarRow);
        pillar.elements?.forEach((element) => {
          let elementRow: PriorityRow = {
            conditionName: element.element_name!,
            displayName: element.display_name,
            filepath: element.filepath!.concat('_normalized'),
            children: [],
            level: 1,
            expanded: true,
          };
          data.push(elementRow);
          pillarRow.children.push(elementRow);
          element.metrics?.forEach((metric) => {
            let metricRow: PriorityRow = {
              conditionName: metric.metric_name!,
              displayName: metric.display_name,
              filepath: metric.filepath!,
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

  private convertConditionScoresToDictionary(
    scores: PlanConditionScores
  ): Map<string, number> {
    let scoreMap = new Map<string, number>();
    scores.conditions.forEach((condition) => {
      scoreMap.set(condition.condition, condition.mean_score);
    });
    return scoreMap;
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
}

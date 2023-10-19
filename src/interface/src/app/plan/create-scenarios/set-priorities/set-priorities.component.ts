import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Plan } from 'src/app/types';

import { MapService } from './../../../services/map.service';
import { PlanService } from './../../../services/plan.service';
import { ConditionsConfig } from './../../../types/data.types';
import { PlanConditionScores } from './../../../types/plan.types';
import {
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '../../../types/scenario.types';

export interface ScoreColumn {
  label: string;
  score: number;
}

interface PriorityRow {
  selected?: boolean;
  visible?: boolean; // Visible as raster data on map
  expanded?: boolean; // Children in table are not hidden
  hidden?: boolean; // Row hidden from table (independent of "visible" attribute)
  disabled?: boolean; // Cannot be selected (because ancestor is selected)
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
  @Input() formGroup: FormGroup | undefined;
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Input() treatmentGoals$: TreatmentGoalConfig[] | null = null;
  @Output() changeConditionEvent = new EventEmitter<string>();

  conditionScores = new Map<string, ScoreColumn>();
  displayedColumns: string[] = ['selected', 'displayName', 'score', 'visible'];
  datasource = new MatTableDataSource<PriorityRow>();
  selectedQuestion: TreatmentQuestionConfig | null = null;

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
          expanded: false,
        };
        data.push(pillarRow);
        pillar.elements
          ?.filter((element) => element.display)
          .forEach((element) => {
            let elementRow: PriorityRow = {
              conditionName: element.element_name!,
              displayName: element.display_name,
              filepath: element.filepath!.concat('_normalized'),
              children: [],
              level: 1,
              expanded: false,
              hidden: true,
            };
            data.push(elementRow);
            pillarRow.children.push(elementRow);
            element.metrics
              ?.filter((metric) => !!metric.filepath)
              .forEach((metric) => {
                let metricRow: PriorityRow = {
                  conditionName: metric.metric_name!,
                  displayName: metric.display_name,
                  filepath: metric.filepath!.concat('_normalized'),
                  children: [],
                  level: 2,
                  hidden: true,
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
  ): Map<string, ScoreColumn> {
    let scoreMap = new Map<string, ScoreColumn>();
    scores.conditions.forEach((condition) => {
      scoreMap.set(condition.condition, {
        label: this.scoreToLabel(condition.mean_score),
        score: condition.mean_score,
      });
    });
    return scoreMap;
  }

  private scoreToLabel(score: number): string {
    // TEMPORARY: use 5 equal buckets for scores [-1, 1] (Lowest, Low, Medium, High, Highest)
    if (score < -0.6) return 'Lowest';
    if (score < -0.2) return 'Low';
    if (score < 0.2) return 'Medium';
    if (score < 0.6) return 'High';
    return 'Highest';
  }

  getScoreLabel(conditionName: string): string | undefined {
    return this.conditionScores.get(conditionName)?.label;
  }

  getScore(conditionName: string): number | undefined {
    return this.conditionScores.get(conditionName)?.score;
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

  /** Update the priority list with the user's current selections and disable descendants. */
  updatePrioritiesFormControl(
    priority: PriorityRow,
    event: MatCheckboxChange
  ): void {
    // const selectedPriorities: string[] = this.datasource.data
    //   .filter((row) => row.selected)
    //   .map((row) => row.conditionName);

    if (event.checked) {
      this.disableDescendants(priority);
    } else {
      this.enableDescendants(priority);
    }
  }

  /** Update the checkboxes with the current form value. */
  updateSelectedPriorities(): void {
    this.datasource.data = this.datasource.data.map((row) => {
      return row;
    });
  }

  private disableDescendants(priority: PriorityRow): void {
    priority.children.forEach((descendant) => {
      descendant.disabled = true;
      this.disableDescendants(descendant);
    });
  }

  private enableDescendants(priority: PriorityRow): void {
    priority.children.forEach((descendant) => {
      descendant.disabled = false;
      this.enableDescendants(descendant);
    });
  }
}

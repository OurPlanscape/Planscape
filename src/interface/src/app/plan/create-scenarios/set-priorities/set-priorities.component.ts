import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { colormapConfigToLegend, Legend, Plan } from 'src/app/types';

import { MapService } from './../../../services/map.service';
import { PlanService } from './../../../services/plan.service';
import { ConditionsConfig } from './../../../types/data.types';
import { PlanConditionScores } from './../../../types/plan.types';

export interface ScoreColumn {
  label: string;
  score: number;
}

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
  @Input() formGroup: FormGroup | undefined;
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Output() changeConditionEvent = new EventEmitter<string>();
  @Output() formNextEvent = new EventEmitter<void>();
  @Output() formBackEvent = new EventEmitter<void>();

  readonly text1: string = `
    Optimize your treatment objective by evaluating your planning area and selecting priorities.
    Select at least one. Only selected priorities are used to identify project areas and prioritize
    treatments. Note: For the most accurate estimated outcome, choose no more than 5.
  `;

  conditionScores = new Map<string, ScoreColumn>();
  displayedColumns: string[] = ['selected', 'displayName', 'score', 'visible'];
  datasource = new MatTableDataSource<PriorityRow>();
  legend: Legend | undefined;

  constructor(
    private mapService: MapService,
    private planService: PlanService
  ) {
    this.mapService
      .getColormap('turbo')
      .pipe(take(1))
      .subscribe((colormapConfig) => {
        this.legend = colormapConfigToLegend(colormapConfig);
        this.legend!.labels = ['Poor', 'OK', 'Excellent'];
      });
  }

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
        // Prefill checkboxes for priorities that are already in the form.
        this.formGroup
          ?.get('priorities')
          ?.valueChanges.pipe(take(1))
          .subscribe((_) => this.updateSelectedPriorities());
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
        pillar.elements?.forEach((element) => {
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
          element.metrics?.forEach((metric) => {
            let metricRow: PriorityRow = {
              conditionName: metric.metric_name!,
              displayName: metric.display_name,
              filepath: metric.filepath!,
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

  /** Update the priority list with the user's current selections. */
  updatePrioritiesFormControl(): void {
    const selectedPriorities: string[] = this.datasource.data
      .filter((row) => row.selected)
      .map((row) => row.conditionName);
    this.formGroup?.get('priorities')?.setValue(selectedPriorities);
    this.formGroup?.get('priorities')?.markAsDirty();
  }

  /** Update the checkboxes with the current form value. */
  updateSelectedPriorities(): void {
    const priorities: string[] = this.formGroup?.get('priorities')?.value;
    this.datasource.data = this.datasource.data.map((row) => {
      if (priorities.includes(row.conditionName)) {
        row.selected = true;
      }
      return row;
    });
  }
}

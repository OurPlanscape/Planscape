import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { filter, take } from 'rxjs';

import { MapService, PlanService } from 'src/app/services';
import {
  Legend,
  colormapConfigToLegend,
  ConditionsConfig,
  PlanConditionScores,
  Plan,
} from 'src/app/types';

// TODO: Share common types and methods (set-priorities component)
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
  selector: 'app-map-layers',
  templateUrl: './map-layers.component.html',
  styleUrls: ['./map-layers.component.scss'],
})
export class MapLayersComponent implements OnInit {
  @Input() plan: Plan | null = null;
  @Output() changeConditionEvent = new EventEmitter<string>();

  conditionScores = new Map<string, ScoreColumn>();
  displayedColumns: string[] = ['displayName', 'score', 'visible'];
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
      });
  }

  ngOnChanges() {
    if (this.plan) {
      this.planService
        .getConditionScoresForPlanningArea(this.plan!.id)
        .subscribe((response) => {
          this.conditionScores =
            this.convertConditionScoresToDictionary(response);
        });
    }
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
              displayName: 'foo', //element.display_name,
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

  /**
   * Toggle visibility for a priority condition. If visibility is ON, turn visibility
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

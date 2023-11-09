import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Plan } from 'src/app/types';
import { MapService } from './../../../services/map.service';
import { ConditionsConfig } from './../../../types/data.types';
import {
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '../../../types/scenario.types';

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

  datasource = new MatTableDataSource<PriorityRow>();
  selectedQuestion: TreatmentQuestionConfig | null = null;

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
}

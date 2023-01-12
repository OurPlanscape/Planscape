import { filter } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';
import { ConditionsConfig } from './../../../types/data.types';
import { MapService } from './../../../services/map.service';
import { Component, OnInit } from '@angular/core';

interface PriorityRow {
  selected?: boolean;
  visible?: boolean;
  conditionName: string;
  score: number;
  children: PriorityRow[];
}

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit {
  readonly text1: string = `
    Condition scores represent the condition of each priority within the defined planning area.
    Select at least one priority to create scenarios. Note: Choosing more than 5 may dilute
    the data.
  `;

  displayedColumns: string[] = [
    'selected',
    'visible',
    'conditionName',
    'score'
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
        score: 0,
        children: [],
      });
      pillar.elements?.forEach((element) => {
        data.push({
          conditionName: element.display_name
            ? element.display_name
            : element.element_name!,
          score: 0,
          children: [],
        });
        element.metrics?.forEach((metric) => {
          data.push({
            conditionName: metric.display_name
              ? metric.display_name
              : metric.metric_name!,
            score: 0,
            children: [],
          });
        });
      });
    });
    return data;
  }
}

import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { STAND_OPTIONS, STAND_SIZE } from '../../plan/plan-helpers';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { DataLayer, ScenarioConfig } from '@types';
import { NewScenarioState } from '../new-scenario.state';
import {
  catchError,
  distinctUntilChanged,
  of,
  filter,
  switchMap,
  map,
} from 'rxjs';
import { DataLayersService } from '@services';

@UntilDestroy()
@Component({
  selector: 'app-scenario-summary',
  standalone: true,
  imports: [SectionComponent, NgIf],
  templateUrl: './scenario-summary.component.html',
  styleUrl: './scenario-summary.component.scss',
})
export class ScenarioSummaryComponent {
  @Input() title: string = '';

  @Input() treatmentGoal?: string;
  @Input() priorityObjectives?: string;

  @Input() standSize: STAND_SIZE | null = null;

  standSizeOptions = STAND_OPTIONS;

  constructor(
    private newScenarioState: NewScenarioState,
    private dataLayersService: DataLayersService
  ) {
    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        map((config: ScenarioConfig) => config.priority_objectives),
        filter((ids): ids is number[] => Array.isArray(ids) && ids.length > 0),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        ),
        switchMap((ids: number[]) =>
          this.dataLayersService.getDataLayersByIds(ids).pipe(
            map((layers) => layers ?? ([] as DataLayer[])),
            catchError((error) => {
              console.error('Error fetching data layers:', error);
              return of<DataLayer[]>([]);
            })
          )
        )
      )
      .subscribe((layers: DataLayer[]) => {
        this.priorityObjectives = layers.map((layer) => layer.name).join(', ');
      });
  }
}

import { Component, inject, OnDestroy } from '@angular/core';
import { ScenarioState } from '../scenario.state';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { STAND_OPTIONS } from '@plan/plan-helpers';
import {
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ForsysService } from '@services/forsys.service';
import { PLANNING_APPROACH_LABELS, ScenarioV3Config } from '@types';
import {
  isCustomScenario,
  isPlanningApproachSubUnits,
} from '../scenario-helper';
import { DatalayersService } from '@app/api/generated/datalayers/datalayers.service';
import { DataLayer } from '@app/api/generated/planscapeAPI.schemas';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeatureService } from '@features/feature.service';
import { filter } from 'rxjs/operators';

@UntilDestroy()
@Component({
  selector: 'app-scenario-config-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    DecimalPipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: './scenario-config-overlay.component.html',
  styleUrl: './scenario-config-overlay.component.scss',
})
export class ScenarioConfigOverlayComponent implements OnDestroy {
  private scenarioState = inject(ScenarioState);
  private forsysService = inject(ForsysService);
  private datalayersService = inject(DatalayersService);
  private featureService = inject(FeatureService);

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.forsysService.excludedAreas$;

  configuration: ScenarioV3Config | null = null;
  slopeId: number | null = null;
  distanceToRoadsId: number | null = null;

  constructor() {
    this.currentScenario$.pipe(untilDestroyed(this)).subscribe((scenario) => {
      this.configuration = scenario.configuration as ScenarioV3Config;
    });
  }

  readonly standSizeOptions = STAND_OPTIONS;
  readonly planningApproachLabels = PLANNING_APPROACH_LABELS;

  forsysData$ = this.forsysService.forsysData$
    .pipe(untilDestroyed(this))
    .subscribe((forsys) => {
      this.slopeId = forsys.thresholds.slope.id;
      this.distanceToRoadsId = forsys.thresholds.distance_from_roads.id;
    });

  scenarioHasPlanningApproachSubUnits$ = this.currentScenario$.pipe(
    map(
      (s) =>
        s.planning_approach && isPlanningApproachSubUnits(s.planning_approach)
    )
  );

  selectedExcludedAreas$ = combineLatest([
    this.currentScenario$,
    this.excludedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, excludedAreas]) => {
      //TODO: when we have a ScenarioBase type and a way to query just config
      // we should replace this cast
      const config = scenario.configuration as ScenarioV3Config;
      const ids = config.excluded_areas ?? [];
      const labels = ids
        .map((id) => excludedAreas.find((a) => a.id === id)?.name)
        .filter((v): v is string => !!v);
      return labels.length ? labels.join(', ') : '--';
    }),
    catchError(() => {
      return '--';
    })
  );

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  isCustomScenario$ = this.currentScenario$.pipe(
    map((scenario) => isCustomScenario(scenario.type))
  );

  private fetchLayersByIds(ids: number[]) {
    if (!ids || ids.length === 0) {
      return of<DataLayer[]>([]);
    }
    return this.datalayersService
      .datalayersList({ id__in: ids })
      .pipe(map((response) => response.results ?? []));
  }

  priorityObjectives$ = this.currentScenario$.pipe(
    switchMap((s) =>
      this.fetchLayersByIds(s.configuration?.priority_objectives ?? [])
    ),
    map((layers) => layers.map((dl) => dl.name).join(', ')),
    shareReplay(1)
  );

  cobenefits$ = this.currentScenario$.pipe(
    switchMap((s) => this.fetchLayersByIds(s.configuration?.cobenefits ?? [])),
    map((layers) => layers.map((dl) => dl.name).join(', ')),
    shareReplay(1)
  );

  subUnitLayerName$ = this.currentScenario$.pipe(
    map((s) => s.configuration?.sub_units_layer),
    filter((id): id is number => id !== undefined),
    switchMap((id) => this.fetchLayersByIds([id])),
    map((layers) => layers.map((dl) => dl.name).join(', ')),
    shareReplay(1)
  );

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy() {
    this.close();
  }

  get isPlanningApproachEnabled() {
    return this.featureService.isFeatureEnabled('PLANNING_APPROACH');
  }
}

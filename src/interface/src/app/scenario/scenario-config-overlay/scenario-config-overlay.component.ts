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
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ForsysService } from '@services/forsys.service';
import {
  AdvStandLevelConstraintData,
  ApiModule,
  DataLayer,
  PLANNING_APPROACH_LABELS,
  Scenario,
  ScenarioPriority,
  ScenarioV3Config,
} from '@types';
import {
  isCustomScenario,
  isPlanningApproachSubUnits,
} from '../scenario-helper';
import { DataLayersService } from '@services';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { combineLatestWith, filter, startWith, tap } from 'rxjs/operators';
import { FeaturesModule } from '@app/features/features.module';
import { PlanState } from '@app/plan/plan.state';
import { ModuleService } from '@app/services/module.service';

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
    FeaturesModule,
  ],
  templateUrl: './scenario-config-overlay.component.html',
  styleUrl: './scenario-config-overlay.component.scss',
})
export class ScenarioConfigOverlayComponent implements OnDestroy {
  private scenarioState = inject(ScenarioState);
  private forsysService = inject(ForsysService);
  private dataLayersService = inject(DataLayersService);
  private planState = inject(PlanState);
  private moduleService = inject(ModuleService);

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.forsysService.excludedAreas$;
  includedAreas$ = this.forsysService.includedAreas$;

  planningArea$ = this.planState.currentPlan$;

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

  selectedIncludedAreas$ = combineLatest([
    this.currentScenario$,
    this.includedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, includedAreas]) => {
      const config = scenario.configuration as ScenarioV3Config;
      const ids = config.included_areas ?? [];

      const labels = ids
        .map((id) => includedAreas.find((a) => a.id === id)?.name)
        .filter((v): v is string => !!v);

      return labels;
    }),
    startWith(null),
    catchError(() => of([]))
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
      return labels.length ? labels : [];
    }),
    catchError(() => {
      return [];
    })
  );

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  isCustomScenario$ = this.currentScenario$.pipe(
    map((scenario) => isCustomScenario(scenario.type))
  );

  priorityObjectives$ = this.currentScenario$.pipe(
    switchMap((s) => {
      const config = s.configuration as ScenarioV3Config | undefined;
      const priorities: ScenarioPriority[] =
        config?.priorities && config.priorities.length > 0
          ? config.priorities
          : (config?.priority_objectives ?? []).map((datalayer) => ({
              datalayer,
              weight: 1,
            }));
      return this.dataLayersService
        .getDataLayersByIds(priorities.map((p) => p.datalayer))
        .pipe(
          map((d: DataLayer[]) => {
            const nameById = new Map(d.map((dl) => [dl.id, dl.name]));
            return priorities
              .map((p) => ({
                name: nameById.get(p.datalayer),
                weight: p.weight,
              }))
              .filter((p): p is { name: string; weight: number } => !!p.name);
          })
        );
    }),
    shareReplay(1)
  );

  cobenefits$ = this.currentScenario$.pipe(
    filter((s): s is Scenario => !!s),
    switchMap((s) => {
      const ids = s.configuration?.cobenefits ?? [];
      if (ids.length === 0) {
        return of([]);
      }
      return this.dataLayersService.getDataLayersByIds(ids).pipe(
        map((d: DataLayer[]) => (d ?? []).map((dl) => dl.name)),
        catchError(() => of(null))
      );
    }),
    shareReplay(1)
  );

  subUnitLayerName$ = this.currentScenario$.pipe(
    map((s) => s.configuration?.sub_units_layer),
    switchMap((id) =>
      id === undefined
        ? of([])
        : this.dataLayersService.getDataLayersByIds([id]).pipe(
            map((d: DataLayer[]) => d.map((dl) => dl.name)),
            catchError(() => of(null))
          )
    ),
    shareReplay(1)
  );

  get standardConstraints() {
    return (this.configuration?.constraints ?? []).filter(
      (c) =>
        c.datalayer === this.slopeId || c.datalayer === this.distanceToRoadsId
    );
  }

  // This calls the module service to collect the known Adv SLC layers
  advStandLevelConstraintLayers$: Observable<DataLayer[]> = this.moduleService
    .getModule<
      ApiModule<AdvStandLevelConstraintData>
    >('advanced_stand_level_constraint')
    .pipe(
      map((data) => data.options.datalayers),
      tap((layers) => {
        return layers;
      }),
      shareReplay(1)
    );

  // compare the constraints
  selectedAdvStandLevelConstraints$ = combineLatest([
    this.currentScenario$,
    this.advStandLevelConstraintLayers$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, advSLCLayers]) => {
      const config = scenario.configuration as ScenarioV3Config;
      const constraints = config.constraints ?? [];
      const selectedConstraints = constraints
        .map((c) => advSLCLayers.find((a) => a.id === c.datalayer))
        .map((c) => c?.name)
        .filter((v): v is string => !!v);
      return selectedConstraints.length ? selectedConstraints : [];
    }),
    catchError(() => {
      return [];
    })
  );

  // Global loader, waits until we have results from several BE calls
  public globalLoading$ = this.selectedIncludedAreas$.pipe(
    combineLatestWith(
      this.cobenefits$,
      this.planningArea$,
      this.priorityObjectives$,
      this.advStandLevelConstraintLayers$,
      this.subUnitLayerName$
    ),
    map(([areas, cobenefits, pa, priorities, advSLCLayers, subUnit]) => {
      return (
        areas === null ||
        cobenefits === null ||
        pa === null ||
        priorities === null ||
        advSLCLayers === null ||
        subUnit === null
      );
    }),
    startWith(true)
  );

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy() {
    this.close();
  }
}

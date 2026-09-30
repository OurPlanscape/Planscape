import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide';
import { FeaturesModule } from '@app/features/features.module';
import {
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { ScenarioState } from '../scenario.state';
import { ScenarioService } from '@services';
import { ScenarioConfigurationDetails, StandLevelConstraint } from '@types';
import {
  getConstraintDisplayName,
  isCustomScenario,
  isPlanningApproachSubUnits,
} from '../scenario-helper';
import { ForsysService } from '@app/services/forsys.service';

type ConfigLoadingState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; config: ScenarioConfigurationDetails };

@Component({
  selector: 'app-scenario-config-list-overlay',
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
  templateUrl: './scenario-config-list-overlay.component.html',
  styleUrl: './scenario-config-list-overlay.component.scss',
})
export class ScenarioConfigListOverlayComponent implements OnDestroy {
  readonly isSubUnits = isPlanningApproachSubUnits;

  private scenarioState = inject(ScenarioState);
  private scenarioService = inject(ScenarioService);

  private forsysService = inject(ForsysService);

  private thresholdIds$ = this.forsysService.forsysData$.pipe(
    map((f) => ({
      slopeId: f.thresholds.slope.id,
      distanceToRoadsId: f.thresholds.distance_from_roads.id,
    }))
  );

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;

  configLoadingState$ = this.scenarioState.currentScenario$.pipe(
    switchMap((scenario) =>
      combineLatest([
        this.scenarioService.getScenarioConfiguration(scenario.id),
        this.forsysService.forsysData$,
      ]).pipe(
        // Both observables must emit before map runs, but we only emit config
        map(([config]): ConfigLoadingState => ({ status: 'ready', config })),
        catchError(() => of<ConfigLoadingState>({ status: 'error' })),
        startWith<ConfigLoadingState>({ status: 'loading' })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  config$ = this.configLoadingState$.pipe(
    map((s) => (s.status === 'ready' ? s.config : null))
  );
  hasError$ = this.configLoadingState$.pipe(map((s) => s.status === 'error'));
  isLoading$ = this.configLoadingState$.pipe(
    map((s) => s.status === 'loading')
  );

  isCustomScenario$ = this.configLoadingState$.pipe(
    map((s) => s.status === 'ready' && isCustomScenario(s.config.type))
  );

  standLevelConstraints$ = combineLatest([
    this.config$,
    this.thresholdIds$,
  ]).pipe(
    map(([config, ids]) =>
      (config?.stand_level_constraints ?? []).map((constraint) => ({
        constraint,
        kind:
          constraint.datalayer.id === ids.slopeId
            ? 'slope'
            : constraint.datalayer.id === ids.distanceToRoadsId
              ? 'roads'
              : 'other',
      }))
    )
  );

  hasSubUnits$ = this.configLoadingState$.pipe(
    map(
      (s) =>
        s.status === 'ready' &&
        isPlanningApproachSubUnits(s.config.planning_approach.key)
    )
  );

  constraintName(c: StandLevelConstraint): string {
    return getConstraintDisplayName(c, c.datalayer);
  }

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy() {
    this.close();
  }
}

import { Component, inject, OnDestroy } from '@angular/core';
import { ScenarioState } from '../scenario.state';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { STAND_OPTIONS } from 'src/app/plan/plan-helpers';
import { catchError, combineLatest, map } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ForsysService } from '@services/forsys.service';
import { ScenarioV3Config } from '@types';
import { isCustomScenario } from '../scenario-helper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@UntilDestroy()
@Component({
  selector: 'app-scenario-v3-config-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    DecimalPipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: './scenario-v3-config-overlay.component.html',
  styleUrl: './scenario-v3-config-overlay.component.scss',
})
export class ScenarioV3ConfigOverlayComponent implements OnDestroy {
  private scenarioState: ScenarioState = inject(ScenarioState);
  private forsysService: ForsysService = inject(ForsysService);

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.forsysService.excludedAreas$;

  configuration: ScenarioV3Config | null = null;
  slopeId: number | null = null;
  distanceToRoadsId: number | null = null;

  readonly standSizeOptions = STAND_OPTIONS;

  forsysData$ = this.forsysService.forsysData$
    .pipe(untilDestroyed(this))
    .subscribe((forsys) => {
      this.slopeId = forsys.thresholds.slope.id;
      this.distanceToRoadsId = forsys.thresholds.distance_from_roads.id;
    });

  selectedExcludedAreas$ = combineLatest([
    this.currentScenario$,
    this.excludedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, excludedAreas]) => {
      //TODO: when we have a ScenarioBase type and a way to query just config
      // we should replace this cast
      this.configuration = scenario.configuration as ScenarioV3Config;

      const ids = this.configuration.excluded_areas ?? [];
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

  priorityObjectives$ = this.currentScenario$.pipe(
    map((scenario) =>
      scenario.priority_objectives?.map((dl) => dl.name).join(', ')
    )
  );

  cobenefits$ = this.currentScenario$.pipe(
    map((scenario) => scenario.cobenefits?.map((dl) => dl.name).join(', '))
  );

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy() {
    this.close();
  }
}

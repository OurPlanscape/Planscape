import { Component, inject, OnDestroy } from '@angular/core';
import { ScenarioState } from '../scenario.state';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { STAND_OPTIONS } from 'src/app/plan/plan-helpers';
import { BehaviorSubject, catchError, combineLatest, map } from 'rxjs';
import { ScenarioService } from '@services';
import { MatLegacyProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-scenario-config-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    MatLegacyProgressSpinnerModule,
  ],
  templateUrl: './scenario-config-overlay.component.html',
  styleUrl: './scenario-config-overlay.component.scss',
})
export class ScenarioConfigOverlayComponent implements OnDestroy {
  private scenarioState: ScenarioState = inject(ScenarioState);
  private scenarioService: ScenarioService = inject(ScenarioService);

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.scenarioService.getExcludedAreas();
  loadingExcludedAreas$ = new BehaviorSubject(true);
  readonly standSizeOptions = STAND_OPTIONS;

  selectedExcludedAreas$ = combineLatest([
    this.currentScenario$,
    this.excludedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, excludedAreas]) => {
      const ids = scenario.configuration?.excluded_areas ?? [];
      const labels = ids
        .map((id) => excludedAreas.find((a) => a.id === id)?.label)
        .filter((v): v is string => !!v);
      this.loadingExcludedAreas$.next(false);
      return labels.length ? labels.join(', ') : '--';
    }),
    catchError(() => {
      this.loadingExcludedAreas$.next(false);
      return '--';
    })
  );

  scenarioGoal$ = this.scenarioState.currentScenario$.pipe(
    map((s) => s.treatment_goal?.name || '')
  );

  close() {
    this.loadingExcludedAreas$.next(true);
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy(): void {
    this.close();
  }
}

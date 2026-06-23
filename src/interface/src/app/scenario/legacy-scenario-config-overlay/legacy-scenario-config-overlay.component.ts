import { Component, inject, OnDestroy } from '@angular/core';
import { ScenarioState } from '../scenario.state';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { STAND_OPTIONS } from '@plan/plan-helpers';
import { catchError, combineLatest, map, of, startWith } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ForsysService } from '@services/forsys.service';
import { FeaturesModule } from '@app/features/features.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@UntilDestroy()
@Component({
  selector: 'app-legacy-scenario-config-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    DecimalPipe,
    FeaturesModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './legacy-scenario-config-overlay.component.html',
  styleUrl: './legacy-scenario-config-overlay.component.scss',
})
export class LegacyScenarioConfigOverlayComponent implements OnDestroy {
  private scenarioState: ScenarioState = inject(ScenarioState);
  private forsysService: ForsysService = inject(ForsysService);

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.forsysService.excludedAreas$;
  includedAreas$ = this.forsysService.includedAreas$;

  readonly standSizeOptions = STAND_OPTIONS;

  selectedIncludedAreas$ = combineLatest([
    this.currentScenario$,
    this.includedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, includedAreas]) => {
      const ids = scenario.configuration?.included_areas ?? [];

      const labels = ids
        .map((id) => includedAreas.find((a) => a.id === id)?.name)
        .filter((v): v is string => !!v);

      return labels.length ? labels.join(', ') : '--';
    }),
    startWith(null),
    catchError(() => of('--'))
  );

  selectedExcludedAreas$ = combineLatest([
    this.currentScenario$,
    this.excludedAreas$,
  ]).pipe(
    untilDestroyed(this),
    map(([scenario, excludedAreas]) => {
      const ids = scenario.configuration?.excluded_areas ?? [];
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

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy(): void {
    this.close();
  }
}

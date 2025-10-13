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
import { Constraint } from '@types';
import { ForsysData } from 'src/app/types/module.types';
import { AccountRoutingModule } from 'src/app/account/account-routing.module';

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
    AccountRoutingModule,
  ],
  templateUrl: './scenario-config-overlay.component.html',
  styleUrl: './scenario-config-overlay.component.scss',
})
@UntilDestroy()
export class ScenarioConfigOverlayComponent implements OnDestroy {
  private scenarioState: ScenarioState = inject(ScenarioState);
  private forsysService: ForsysService = inject(ForsysService);

  constructor() {
    this.forsysService.forsysData$
      .pipe(untilDestroyed(this))
      .subscribe((forsys) => {
        this.knownConstraintsMap = forsys;
      });
  }

  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;
  currentScenario$ = this.scenarioState.currentScenario$;
  excludedAreas$ = this.forsysService.excludedAreas$;
  knownConstraintsMap: ForsysData | null = null;

  readonly standSizeOptions = STAND_OPTIONS;

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

  constraintsToStrings(constraints: Constraint[]) {
    const toDisplay: string[] = [];
    this.knownConstraintsMap?.thresholds.distance_from_roads.id;
    constraints.map((c) => {
      if (
        c.datalayer ===
        this.knownConstraintsMap?.thresholds.distance_from_roads.id
      ) {
        toDisplay.push(`Distance from roads less than (<) ${c.value} %`);
      }
      if (c.datalayer === this.knownConstraintsMap?.thresholds.slope.id) {
        toDisplay.push(`Slope less or equal than (<=) ${c.value} %`);
      }
    });
    return toDisplay;
  }

  close() {
    this.scenarioState.setDisplayOverlay(false);
  }

  ngOnDestroy(): void {
    this.close();
  }
}

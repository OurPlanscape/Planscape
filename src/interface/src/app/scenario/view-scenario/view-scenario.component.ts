import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  combineLatest,
  EMPTY,
  interval,
  map,
  Observable,
  skip,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { ScenarioState } from '../../scenario/scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { Scenario } from '@types';
import { filter } from 'rxjs/operators';
import { FeatureService } from '../../features/feature.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { ScenarioDownloadFooterComponent } from '../scenario-download-footer/scenario-download-footer.component';
import { NewTreatmentFooterComponent } from 'src/app/scenario/new-treatment-footer/new-treatment-footer.component';
import { TreatmentsTabComponent } from 'src/app/scenario/treatments-tab/treatments-tab.component';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ScenarioFailureComponent } from '../scenario-failure/scenario-failure.component';
import { ScenarioResultsComponent } from '../scenario-results/scenario-results.component';
import { ScenarioPendingComponent } from '../scenario-pending/scenario-pending.component';
import { canAddTreatmentPlan } from 'src/app/plan/permissions';
import { PlanState } from 'src/app/plan/plan.state';
import { POLLING_INTERVAL } from 'src/app/plan/plan-helpers';
import { BaseLayersComponent } from 'src/app/base-layers/base-layers/base-layers.component';

enum ScenarioTabs {
  RESULTS,
  DATA_LAYERS,
  BASE_LAYERS,
  TREATMENTS,
}

@UntilDestroy()
@Component({
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    ScenarioDownloadFooterComponent,
    NewTreatmentFooterComponent,
    TreatmentsTabComponent,
    MatTabsModule,
    DataLayersComponent,
    ScenarioFailureComponent,
    ScenarioResultsComponent,
    ScenarioPendingComponent,
    ScenarioPendingComponent,
    BaseLayersComponent,
  ],
  selector: 'app-view-scenario',
  templateUrl: './view-scenario.component.html',
  styleUrl: './view-scenario.component.scss',
})
export class ViewScenarioComponent {
  planId = this.route.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  selectedTab = ScenarioTabs.RESULTS;

  plan$ = this.planState.currentPlan$;

  scenario$: Observable<Scenario> = this.scenarioState.currentScenario$;

  showTreatmentFooter$ = combineLatest([this.plan$, this.scenario$]).pipe(
    map(
      ([plan, scenario]) =>
        this.scenarioHasResults(scenario) && !!plan && canAddTreatmentPlan(plan)
    )
  );

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private route: ActivatedRoute,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private router: Router,
    private dataLayersStateService: DataLayersStateService,
    private featureService: FeatureService
  ) {
    // go to data layers tab when the user clicks the data layer name legend on the map
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });

    // poll if scenario is pending
    this.scenario$
      .pipe(
        untilDestroyed(this),
        switchMap((s) => (this.shouldPoll(s) ? this.startPolling() : EMPTY))
      )
      .subscribe();
  }

  private startPolling() {
    return interval(POLLING_INTERVAL).pipe(
      tap(() => {
        this.scenarioState.reloadScenario();
      }),
      untilDestroyed(this),
      takeUntil(this.scenario$.pipe(filter((s) => !this.shouldPoll(s))))
    );
  }

  goToConfig() {
    this.router.navigate(['plan', this.planId, 'scenario']);
  }

  goToPlan() {
    this.router.navigate(['/plan', this.planId]);
  }

  private shouldPoll(scenario: Scenario) {
    return (
      this.scenarioIsPending(scenario) || this.shouldPollForGeoPackage(scenario)
    );
  }

  private shouldPollForGeoPackage(scenario: Scenario) {
    const geoPackageStatus = scenario.geopackage_status;

    if (
      !geoPackageStatus ||
      !this.featureService.isFeatureEnabled('SCENARIO_IMPROVEMENTS')
    ) {
      return false; // if this is null, we can assume there will be no geopackage, ever
    }
    return geoPackageStatus === 'PENDING' || geoPackageStatus === 'PROCESSING';
  }

  scenarioIsPending(scenario: Scenario) {
    return (
      scenario.scenario_result?.status === 'PENDING' ||
      scenario.scenario_result?.status === 'RUNNING'
    );
  }

  scenarioHasResults(scenario: Scenario) {
    return scenario.scenario_result?.status === 'SUCCESS';
  }

  scenarioHasFailed(scenario: Scenario) {
    const status = scenario.scenario_result?.status;
    return status === 'FAILURE' || status === 'PANIC' || status === 'TIMED_OUT';
  }

  scenarioStatus(scenario: Scenario) {
    return scenario.scenario_result?.status || 'PENDING';
  }

  scenarioPriorities(s: Scenario) {
    return s.configuration.treatment_question?.scenario_priorities || [];
  }

  get onTreatmentsTab() {
    return this.selectedTab === ScenarioTabs.TREATMENTS;
  }

  get onResultsTab() {
    return this.selectedTab === ScenarioTabs.RESULTS;
  }
}

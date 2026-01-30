import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  combineLatest,
  EMPTY,
  interval,
  map,
  Observable,
  of,
  skip,
  catchError,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { ScenarioState } from '../../scenario/scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { Scenario } from '@types';
import { filter } from 'rxjs/operators';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { ScenarioDownloadFooterComponent } from '../scenario-download-footer/scenario-download-footer.component';
import { NewTreatmentFooterComponent } from 'src/app/scenario/new-treatment-footer/new-treatment-footer.component';
import { TreatmentsTabComponent } from 'src/app/scenario/treatments-tab/treatments-tab.component';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ScenarioFailureComponent } from '../scenario-failure/scenario-failure.component';
import { ScenarioResultsComponent } from '../scenario-results/scenario-results.component';
import { userCanAddTreatmentPlan } from 'src/app/plan/permissions';
import { PlanState } from 'src/app/plan/plan.state';
import { getPlanPath, POLLING_INTERVAL } from 'src/app/plan/plan-helpers';
import { BaseLayersComponent } from 'src/app/base-layers/base-layers/base-layers.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import {
  scenarioCanHaveTreatmentPlans,
  suggestUniqueName,
} from '../scenario-helper';
import { ScenarioSetupModalComponent } from '../scenario-setup-modal/scenario-setup-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScenarioService } from '@services';

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
    BaseLayersComponent,
    MatTooltipModule,
    NgClass,
  ],
  selector: 'app-view-scenario',
  templateUrl: './view-scenario.component.html',
  styleUrl: './view-scenario.component.scss',
})
export class ViewScenarioComponent {
  planId = this.route.snapshot.parent?.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  selectedTab = ScenarioTabs.RESULTS;

  plan$ = this.planState.currentPlan$;

  scenario$: Observable<Scenario> = this.scenarioState.currentScenario$;

  showTreatmentFooter$ = combineLatest([this.plan$, this.scenario$]).pipe(
    map(
      ([plan, scenario]) =>
        this.scenarioHasResults(scenario) &&
        !!plan &&
        userCanAddTreatmentPlan(plan) &&
        this.scenarioCanHaveTreatmentPlans(scenario)
    )
  );
  isLoadingDialog = false;

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private route: ActivatedRoute,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private scenarioService: ScenarioService,
    private router: Router,
    private dataLayersStateService: DataLayersStateService,
    private breadcrumbService: BreadcrumbService,
    private dialog: MatDialog
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
        switchMap((s) => {
          // On specific scenario
          this.breadcrumbService.updateBreadCrumb({
            label: 'Scenario: ' + s.name,
            backUrl: getPlanPath(this.planId),
          });
          return this.shouldPoll(s) ? this.startPolling() : EMPTY;
        })
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

  handleTryAgain(scenario: Scenario) {
    this.isLoadingDialog = true;
    this.scenarioService
      .getScenariosForPlan(this.planId)
      .pipe(
        take(1),
        map((scenarios) => scenarios.map((s) => s.name)),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((existingNames: string[]) => {
        const suggestedName =
          existingNames.length > 0
            ? suggestUniqueName(scenario.name, existingNames)
            : '';
        this.isLoadingDialog = false;
        this.dialog.open(ScenarioSetupModalComponent, {
          maxWidth: '560px',
          data: {
            planId: this.planId,
            defaultName: suggestedName,
            fromClone: true,
            scenario: scenario,
          },
        });
      });
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

    if (!geoPackageStatus) {
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

  scenarioCanHaveTreatmentPlans(s: Scenario) {
    return scenarioCanHaveTreatmentPlans(s);
  }

  get onTreatmentsTab() {
    return this.selectedTab === ScenarioTabs.TREATMENTS;
  }

  get onResultsTab() {
    return this.selectedTab === ScenarioTabs.RESULTS;
  }
}

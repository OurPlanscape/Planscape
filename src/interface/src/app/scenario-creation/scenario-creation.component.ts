import { Component, HostListener, OnInit } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { StepComponent, StepsComponent, StepsNavComponent } from '@styleguide';
import { CdkStepperModule, StepperSelectionEvent } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SubUnitSelectorComponent } from './sub-unit-selector/sub-unit-selector.component';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { ReactiveFormsModule } from '@angular/forms';
import { ScenarioService, TreatmentGoalsService } from '@services';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DataLayer,
  Scenario,
  SCENARIO_TYPE,
  ScenarioDraftConfiguration,
  ScenarioV3Config,
  ScenarioV3Payload,
} from '@types';
import { MatDialog } from '@angular/material/dialog';
import { StandLevelConstraintsComponent } from '@scenario-creation/step3/stand-level-constraints.component';
import {
  convertFlatConfigurationToDraftPayload,
  isCustomScenario,
} from '@scenario/scenario-helper';
import { ScenarioErrorModalComponent } from '@scenario/scenario-error-modal/scenario-error-modal.component';
import { NewScenarioState } from './new-scenario.state';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from '@plan/plan-helpers';
import { FeaturesModule } from '@features/features.module';
import { TreatmentTargetComponent } from '@scenario-creation/treatment-target/treatment-target.component';
import { filter } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '@standalone/confirmation-dialog/confirmation-dialog.component';
import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
} from '@scenario/scenario.constants';
import { SharedModule } from '@shared';
import { ScenarioState } from '@scenario/scenario.state';
import { ExcludeAreasSelectorComponent } from '@scenario-creation/exclude-areas-selector/exclude-areas-selector.component';
import { ScenarioMapComponent } from '@maplibre-map/scenario-map/scenario-map.component';
import { Step1WithOverviewComponent } from '@scenario-creation/step1-with-overview/step1-with-overview.component';
import { ScenarioSummaryComponent } from '@scenario-creation/scenario-summary/scenario-summary.component';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { CustomPriorityObjectivesComponent } from '@scenario-creation/custom-priority-objectives/custom-priority-objectives.component';
import { FeatureService } from '@features/feature.service';
import { Step1CustomComponent } from '@scenario-creation/step1-custom/step1-custom.component';
import { CustomCobenefitsComponent } from '@scenario-creation/custom-cobenefits/custom-cobenefits.component';
import { MAP_MODULE_NAME } from '@services/map-module.token';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import { MapModuleService } from '@services/map-module.service';
import { PlanState } from '@plan/plan.state';

@UntilDestroy()
@Component({
  selector: 'app-scenario-creation',
  providers: [
    { provide: MAP_MODULE_NAME, useValue: 'forsys' },
    { provide: USE_GEOMETRY, useValue: true },
    BaseLayersStateService,
    DataLayersStateService,
    MapModuleService,
  ],
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    NgIf,
    StepsComponent,
    CdkStepperModule,
    StepComponent,
    StandLevelConstraintsComponent,
    TreatmentTargetComponent,
    FeaturesModule,
    ExcludeAreasSelectorComponent,
    StepsNavComponent,
    ScenarioMapComponent,
    Step1WithOverviewComponent,
    SubUnitSelectorComponent,
    NgClass,
    ScenarioSummaryComponent,
    SharedModule,
    CustomPriorityObjectivesComponent,
    CustomCobenefitsComponent,
    Step1CustomComponent,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent implements OnInit {
  config: Partial<ScenarioV3Config> = {};

  planId = this.route.parent?.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  loading$ = this.newScenarioState.loading$;

  // last step label on the navigation is different from the overview
  private scenarioSteps = [
    ...SCENARIO_OVERVIEW_STEPS.slice(0, -1),
    {
      ...SCENARIO_OVERVIEW_STEPS.at(-1)!,
      label: 'Save & Run Scenario',
    },
  ];
  // last step label on the navigation is different from the overview
  private customSteps = [
    ...CUSTOM_SCENARIO_OVERVIEW_STEPS.slice(0, -1),
    {
      ...CUSTOM_SCENARIO_OVERVIEW_STEPS.at(-1)!,
      label: 'Save & Run Scenario',
    },
  ];

  steps: { icon: string; description: string; label: string }[] = [];

  standSize$ = this.newScenarioState.scenarioConfig$.pipe(
    map((config) => config.stand_size)
  );

  treatmentGoals$ = this.treatmentGoalsService
    .getTreatmentGoals(this.planId)
    .pipe(shareReplay(1));

  treatmentGoalId$ = this.newScenarioState.scenarioConfig$.pipe(
    map((config) => config.treatment_goal)
  );

  treatmentGoalName$ = this.treatmentGoalId$.pipe(
    switchMap((id) =>
      this.treatmentGoals$.pipe(
        map((goals) => goals.find((goal) => goal.id == id))
      )
    ),
    map((goal) => goal?.name)
  );

  priorityObjectivesNames$ =
    this.newScenarioState.priorityObjectivesDetails$.pipe(
      map((layers: DataLayer[]) => layers.map((layer) => layer.name).join(', '))
    );

  scenarioType$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => scenario.type)
  );

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload($event: any) {
    if (!this.newScenarioState.isDraftFinishedSnapshot()) {
      $event.returnValue =
        'Are you sure you want to leave this page? Your unsaved changes will be lost.';
    }
  }

  viewedDataLayer$ = this.dataLayersStateService.viewedDataLayer$;

  constructor(
    private scenarioService: ScenarioService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private treatmentGoalsService: TreatmentGoalsService,
    private featureService: FeatureService,
    private mapModuleService: MapModuleService,
    private planState: PlanState,
    private dataLayersStateService: DataLayersStateService
  ) {
    // Pre load goals
    this.treatmentGoals$.pipe(take(1)).subscribe();
  }

  ngOnInit(): void {
    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        filter((s) => isCustomScenario(s.type)),
        switchMap(() => this.planState.currentPlan$),
        switchMap((plan) => this.mapModuleService.loadMapModule(plan.geometry))
      )
      .subscribe();

    if (this.scenarioId) {
      this.loadExistingScenario();
    }
  }

  loadExistingScenario() {
    this.scenarioState.currentScenario$
      .pipe(untilDestroyed(this))
      .subscribe((scenario) => {
        // Setting up the breadcrumb
        this.breadcrumbService.updateBreadCrumb({
          label: 'Scenario: ' + scenario.name,
          backUrl: getPlanPath(this.planId),
          icon: 'close',
        });
        this.steps = isCustomScenario(scenario.type)
          ? this.customSteps
          : this.scenarioSteps;

        // Mapping the backend object to the frontend configuration
        const currentConfig = this.convertSavedConfigToNewConfig(scenario);
        this.newScenarioState.setScenarioConfig(currentConfig);
        // Setting the initial state for the configuration
        this.config = currentConfig;
      });
  }

  convertSavedConfigToNewConfig(scenario: Scenario): Partial<ScenarioV3Config> {
    const newState = Object.fromEntries(
      Object.entries(scenario.configuration)
        .filter(([, value]) => value != null)
        .map(([key, value]) => [key, value as NonNullable<typeof value>])
    );
    // Adding excluded areas and treatment goal
    newState['excluded_areas'] = scenario.configuration.excluded_areas || [];
    newState['treatment_goal'] = scenario.treatment_goal?.id;
    newState['type'] = scenario.type;
    newState['planning_approach'] = scenario.planning_approach;
    return newState as Partial<ScenarioDraftConfiguration>;
  }

  saveStep(data: Partial<ScenarioDraftConfiguration>): Observable<boolean> {
    return this.newScenarioState.isValidToGoNext$.pipe(
      take(1),
      switchMap((valid) => {
        if (!valid) {
          this.dialog.open(ScenarioErrorModalComponent, {
            data: {
              title: 'Invalid Scenario Configuration',
              message:
                'Scenario must have Potential Treatable Area in order to move forward with planning. Update your selections to allow for available stands',
            },
          });
          return of(false);
        }
        this.config = { ...this.config, ...data };
        this.newScenarioState.setScenarioConfig(this.config);
        return this.savePatch(data).pipe(catchError(() => of(false)));
      }),
      catchError(() => of(false))
    );
  }

  savePatch(data: Partial<ScenarioV3Payload>): Observable<boolean> {
    this.newScenarioState.setLoading(true);
    const thresholdsIdMap = new Map<string, number>();
    thresholdsIdMap.set('slope', this.newScenarioState.getSlopeId());
    thresholdsIdMap.set(
      'distance_to_roads',
      this.newScenarioState.getDistanceToRoadsId()
    );
    const payload = convertFlatConfigurationToDraftPayload(
      data,
      thresholdsIdMap
    );

    return this.scenarioService
      .patchScenarioConfig(this.scenarioId, payload)
      .pipe(
        map((result) => {
          if (result) {
            return true;
          }
          return false;
        }),
        catchError((e) => {
          console.error('Patch error:', e);
          this.newScenarioState.setLoading(false);
          return of(false);
        })
      );
  }

  async onFinish() {
    this.newScenarioState.setLoading(false);
    this.newScenarioState.setDraftFinished(true);
    this.showRunScenarioConfirmation();
  }

  showRunScenarioConfirmation() {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Ready to run the scenario?',
          body: `You're about to run the scenario as it's currently set up. Once the analysis starts, you won't be able to make changes.
                 <br><br>
                 Are you sure you want to proceed?`,
          primaryCta: 'Run Scenario',
        },
      })
      .afterClosed()
      .pipe(filter((confirmed) => !!confirmed))
      .subscribe(() => this.runScenario());
  }

  runScenario() {
    this.newScenarioState.setLoading(true);
    this.scenarioService
      .runScenario(this.scenarioId)
      .pipe(
        finalize(() => {
          this.newScenarioState.setLoading(false);
        })
      )
      .subscribe({
        next: (result) => {
          if (result.id) {
            this.scenarioState.setScenarioId(result.id);
            this.scenarioState.reloadScenario();
          }
          this.router.navigate(['plan', result.planning_area], {
            state: { showInProgressModal: true },
          });
        },
        error: () => {
          this.dialog.open(ScenarioErrorModalComponent);
          this.newScenarioState.setLoading(false);
        },
        complete: () => {
          this.newScenarioState.setLoading(false);
        },
      });
  }

  stepChanged(i: number) {
    this.newScenarioState.setStepIndex(i);
  }

  handleStepChangeEvent(event: StepperSelectionEvent) {
    const newStep = event.selectedStep;
    if (newStep instanceof StepComponent && newStep.stepLogic) {
      newStep.stepLogic.beforeStepLoad();
    }
  }

  clearViewedDataLayer() {
    this.dataLayersStateService.clearViewedDataLayer();
  }

  isCustomScenario(type: SCENARIO_TYPE) {
    return (
      this.featureService.isFeatureEnabled('CUSTOM_SCENARIOS') &&
      isCustomScenario(type)
    );
  }
}

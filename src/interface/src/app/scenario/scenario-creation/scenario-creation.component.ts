import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';

import { AsyncPipe, NgClass, NgIf } from '@angular/common';

import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepComponent, StepsComponent, StepsNavComponent } from '@styleguide';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  skip,
  switchMap,
  take,
} from 'rxjs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ScenarioService, TreatmentGoalsService } from '@services';
import { ActivatedRoute, Router } from '@angular/router';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { nameMustBeNew } from 'src/app/validators/unique-scenario';
import {
  Scenario,
  ScenarioCreation,
  ScenarioV3Config,
  ScenarioV3Payload,
} from '@types';
import { Step1Component } from '../step1/step1.component';
import { MatDialog } from '@angular/material/dialog';
import { StandLevelConstraintsComponent } from '../step3/stand-level-constraints.component';
import { convertFlatConfigurationToDraftPayload } from '../scenario-helper';
import { ScenarioErrorModalComponent } from '../scenario-error-modal/scenario-error-modal.component';
import { NewScenarioState } from '../new-scenario.state';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from 'src/app/plan/plan-helpers';
import { FeaturesModule } from 'src/app/features/features.module';
import { TreatmentTargetComponent } from '../treatment-target/treatment-target.component';
import { filter } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../../standalone/confirmation-dialog/confirmation-dialog.component';

import {
  CUSTOM_SCENARIO_OVERVIEW_STEPS,
  SCENARIO_OVERVIEW_STEPS,
} from '../scenario.constants';

import { SharedModule, SNACK_ERROR_CONFIG } from '@shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScenarioState } from '../scenario.state';
import { ExcludeAreasSelectorComponent } from '../exclude-areas-selector/exclude-areas-selector.component';
import { ScenarioMapComponent } from '../../maplibre-map/scenario-map/scenario-map.component';
import { Step1WithOverviewComponent } from '../step1-with-overview/step1-with-overview.component';
import { ScenarioSummaryComponent } from '../scenario-summary/scenario-summary.component';
import { BaseLayersStateService } from 'src/app/base-layers/base-layers.state.service';
import { ProcessOverviewComponent } from '../process-overview/process-overview.component';
import { FeatureService } from '../../features/feature.service';
import { Step1CustomComponent } from '../step1-custom/step1-custom.component';

enum ScenarioTabs {
  CONFIG,
  DATA_LAYERS,
  BASE_LAYERS,
}

@UntilDestroy()
@Component({
  selector: 'app-scenario-creation',
  providers: [BaseLayersStateService],
  standalone: true,
  imports: [
    AsyncPipe,
    MatTabsModule,
    ReactiveFormsModule,
    NgIf,
    DataLayersComponent,
    StepsComponent,
    CdkStepperModule,
    LegacyMaterialModule,
    StepComponent,
    Step1Component,
    StandLevelConstraintsComponent,
    TreatmentTargetComponent,
    BaseLayersComponent,
    FeaturesModule,
    ExcludeAreasSelectorComponent,
    StepsNavComponent,
    ScenarioMapComponent,
    Step1WithOverviewComponent,
    NgClass,
    ScenarioSummaryComponent,
    SharedModule,
    ProcessOverviewComponent,
    Step1CustomComponent,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent implements OnInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  config: Partial<ScenarioV3Config> = {};

  planId = this.route.parent?.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];
  // TODO: we can remove this status check when the DRAFTS FF is removed
  scenarioStatus = 'NOT_STARTED';
  scenarioName = '';

  form = new FormGroup({
    scenarioName: new FormControl('', [Validators.required]),
  });

  loading$ = this.newScenarioState.loading$;

  stepIndex$ = this.newScenarioState.stepIndex$;

  isFirstIndex$ = this.stepIndex$.pipe(map((i) => i === 0));

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

  steps = this.isCustomScenario() ? this.customSteps : this.scenarioSteps;

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

  // copy of index locally to show the last step as completed
  localIndex = 0;

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload($event: any) {
    if (!this.newScenarioState.isDraftFinishedSnapshot()) {
      /* Most browsers will display their own default dialog to confirm navigation away
        from a window or URL. e.g, "Changes that you made may not be saved"

        Older browsers will display the message in the string below.

        All browsers require this string to be non-empty, in order to display anything.
      */
      $event.returnValue =
        'Are you sure you want to leave this page? Your unsaved changes will be lost.';
    }
  }

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private scenarioService: ScenarioService,
    private newScenarioState: NewScenarioState,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private matSnackBar: MatSnackBar,
    private treatmentGoalsService: TreatmentGoalsService,
    private featureService: FeatureService
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });

    // pre load goals
    this.treatmentGoals$.pipe(take(1)).subscribe();
  }

  ngOnInit(): void {
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
        this.scenarioName = scenario.name;
        //this loads the list of scenario names and looks for dupes.
        //we pass an id to avoid matching against this current scenario id name
        this.refreshScenarioNameValidator(scenario.id);

        this.form.controls.scenarioName.setValue(scenario.name);
        // Mapping the backend object to the frontend configuration
        const currentConfig = this.convertSavedConfigToNewConfig(scenario);
        this.newScenarioState.setScenarioConfig(currentConfig);
        // Setting the initial state for the configuration
        this.config = currentConfig;
        this.scenarioStatus = scenario.scenario_result?.status ?? 'NOT STARTED';
      });
  }

  convertSavedConfigToNewConfig(scenario: Scenario): Partial<ScenarioV3Config> {
    const newState = Object.fromEntries(
      Object.entries(scenario.configuration)
        .filter(([_, value]) => value != null)
        .map(([key, value]) => [key, value as NonNullable<typeof value>])
    );
    // Adding excluded areas and treatment goal
    newState['excluded_areas'] = scenario.configuration.excluded_areas || [];
    newState['treatment_goal'] = scenario.treatment_goal?.id;
    return newState as Partial<ScenarioCreation>;
  }

  saveStep(data: Partial<ScenarioCreation>): Observable<boolean> {
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

        if (this.scenarioStatus === 'DRAFT') {
          if (
            this.scenarioName !== this.form.get('scenarioName')?.value &&
            this.form.get('scenarioName')?.value !== null
          ) {
            this.handleNameChange(
              this.form.get('scenarioName')?.value ?? this.scenarioName
            );
          }
          return this.savePatch(data).pipe(catchError(() => of(false)));
        }

        return of(true);
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

  async handleNameChange(newName: string) {
    if (newName !== null) {
      //this loads the list of scenario names and looks for dupes.
      // we pass an id here, to ensure that a recently changed scenario name for this scenario
      // is also not included in the duplicates comparison list
      const nameValidated = await this.refreshScenarioNameValidator(
        this.scenarioId
      );
      if (nameValidated) {
        this.scenarioService
          .editScenarioName(this.scenarioId, newName, this.planId)
          .subscribe({
            next: () => {
              this.breadcrumbService.updateBreadCrumb({
                label: 'Scenario: ' + newName,
                backUrl: getPlanPath(this.planId),
                icon: 'close',
              });
              this.scenarioName = newName;
            },
            error: (e) => {
              this.matSnackBar.open(
                '[Error] Unable to update name due to a backend error.',
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            },
          });
      }
    }
  }

  showRunScenarioConfirmation() {
    this.localIndex = this.isCustomScenario()
      ? this.steps.length
      : this.steps.length - 1;

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

  async runScenario() {
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
        error: (e) => {
          this.dialog.open(ScenarioErrorModalComponent);
          this.newScenarioState.setLoading(false);
        },
        complete: () => {
          this.newScenarioState.setLoading(false);
        },
      });
  }

  stepChanged(i: number) {
    this.localIndex = i;
    this.newScenarioState.setStepIndex(i);
  }

  scenarioNameMustBeUnique(names: string[] = []): ValidatorFn {
    return (control: AbstractControl) => {
      const name = control.value;

      if (!name || names.length === 0) {
        return null;
      }

      return nameMustBeNew(control, names);
    };
  }

  // Adds the name validator and return true or returns false in case there is an error getting scenarios
  async refreshScenarioNameValidator(currentId?: number): Promise<boolean> {
    try {
      const scenarios = await firstValueFrom(
        this.scenarioService.getScenariosForPlan(this.planId)
      );
      //get all scenario names, but omit any related to this scenario id
      const names = scenarios
        .filter((s) => {
          if (currentId) {
            return s.id !== currentId;
          } else {
            return true;
          }
        })
        .map((s) => s.name);
      const ctrl = this.form.get('scenarioName')!;

      ctrl.setValidators([
        Validators.required,
        this.scenarioNameMustBeUnique(names),
      ]);
      ctrl.updateValueAndValidity({ emitEvent: false });
      return true;
    } catch {
      this.dialog.open(ScenarioErrorModalComponent);
      return false;
    }
  }

  // Placeholder while we develop the feature. Will return true if the flag is on.
  isCustomScenario() {
    return this.featureService.isFeatureEnabled('CUSTOM_SCENARIOS');
  }
}

import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepComponent, StepsComponent } from '@styleguide';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
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
import { ScenarioService } from '@services';
import { ActivatedRoute, Router } from '@angular/router';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { nameMustBeNew } from 'src/app/validators/unique-scenario';
import {
  Scenario,
  ScenarioCreation,
  ScenarioV3Config,
  ScenarioV3Payload,
} from '@types';
import { GoalOverlayService } from '../../plan/goal-overlay/goal-overlay.service';
import { Step1Component } from '../step1/step1.component';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { MatDialog } from '@angular/material/dialog';
import { Step2Component } from '../step2/step2.component';
import { Step4LegacyComponent } from '../step4-legacy/step4-legacy.component';
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
import { EXIT_SCENARIO_MODAL } from '../scenario.constants';
import { SNACK_ERROR_CONFIG } from '@shared';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScenarioState } from '../scenario.state';

enum ScenarioTabs {
  CONFIG,
  DATA_LAYERS,
  BASE_LAYERS,
}

@UntilDestroy()
@Component({
  selector: 'app-scenario-creation',
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
    Step2Component,
    StandLevelConstraintsComponent,
    TreatmentTargetComponent,
    Step4LegacyComponent,
    BaseLayersComponent,
    JsonPipe,
    FeaturesModule,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent
  implements OnInit, CanComponentDeactivate
{
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

  treatable_area$ = this.newScenarioState.availableStands$.pipe(
    map((s) => s.summary.treatable_area)
  );

  loading$ = this.newScenarioState.loading$;

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
    private goalOverlayService: GoalOverlayService,
    private dialog: MatDialog,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private matSnackBar: MatSnackBar
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
  }

  ngOnInit(): void {
    if (this.scenarioId) {
      this.loadExistingScenario();
    }
  }

  loadExistingScenario() {
    this.scenarioService
      .getScenario(this.scenarioId)
      .pipe(untilDestroyed(this))
      .subscribe((scenario) => {
        // Setting up the breadcrumb
        this.breadcrumbService.updateBreadCrumb({
          label: 'Scenario: ' + scenario.name,
          backUrl: getPlanPath(this.planId),
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

  // TODO: we can remove this entire method once we remove SCENARIO_DRAFTS FF
  canDeactivate(): Observable<boolean> | boolean {
    if (this.newScenarioState.isDraftFinishedSnapshot()) {
      return true;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: EXIT_SCENARIO_MODAL,
    });
    return dialogRef.afterClosed();
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
    this.newScenarioState.setStepIndex(i);
    this.goalOverlayService.close();
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
}

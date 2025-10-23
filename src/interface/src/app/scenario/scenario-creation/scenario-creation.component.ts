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
  ScenarioConfig,
  ScenarioConfigPayload,
  ScenarioCreation,
  ScenarioDraftPayload,
} from '@types';
import { GoalOverlayService } from '../../plan/goal-overlay/goal-overlay.service';
import { Step1Component } from '../step1/step1.component';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { ExitWorkflowModalComponent } from '../exit-workflow-modal/exit-workflow-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { Step2Component } from '../step2/step2.component';
import { Step4LegacyComponent } from '../step4-legacy/step4-legacy.component';
import { Step3Component } from '../step3/step3.component';
import {
  convertFormOutputToDraftPayload,
  getScenarioCreationPayloadScenarioCreation,
} from '../scenario-helper';
import { ScenarioErrorModalComponent } from '../scenario-error-modal/scenario-error-modal.component';
import { NewScenarioState } from '../new-scenario.state';
import { FeatureService } from 'src/app/features/feature.service';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from 'src/app/plan/plan-helpers';
import { FeaturesModule } from 'src/app/features/features.module';
import { TreatmentTargetComponent } from '../treatment-target/treatment-target.component';
import { RunScenarioModalComponent } from '../run-scenario-modal/run-scenario-modal.component';
import { filter } from 'rxjs/operators';
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
    Step3Component,
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

  config: Partial<ScenarioCreation> = {};
  draftConfig: Partial<ScenarioDraftPayload> = {};

  planId = this.route.parent?.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];
  // TODO: we can remove this status check when the DRAFTS FF is removed
  scenarioStatus = 'NOT_STARTED';
  finished = false;

  form = new FormGroup({
    scenarioName: new FormControl('', [Validators.required]),
  });

  continueLabel = this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')
    ? 'Save & Continue'
    : 'Next';

  treatable_area$ = this.newScenarioState.availableStands$.pipe(
    map((s) => s.summary.treatable_area)
  );

  loading$ = this.newScenarioState.loading$;

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload($event: any) {
    if (!this.finished) {
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
    private featureService: FeatureService,
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState
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
    // Setting up the breadcrumb
    this.breadcrumbService.updateBreadCrumb({
      label: 'Scenario: New Scenario',
      backUrl: getPlanPath(this.planId),
    });
    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      if (this.scenarioId) {
        this.loadExistingScenario();
      }
    } else {
      // Adding scenario name validator
      this.refreshScenarioNameValidator();
    }
  }

  loadExistingScenario() {
    this.scenarioService
      .getScenario(this.scenarioId)
      .pipe(untilDestroyed(this))
      .subscribe((scenario) => {
        this.form.controls.scenarioName.setValue(scenario.name);
        const currentConfig = this.convertSavedConfigToNewConfig(
          scenario.configuration
        );
        this.newScenarioState.setScenarioConfig(currentConfig);
        this.scenarioStatus = scenario.scenario_result?.status ?? 'NOT STARTED';
      });
  }

  convertSavedConfigToNewConfig(
    config: ScenarioConfig
  ): Partial<ScenarioConfigPayload> {
    const newState = Object.fromEntries(
      Object.entries(config)
        .filter(([_, value]) => value != null)
        .map(([key, value]) => [key, value as NonNullable<typeof value>])
    );
    return newState as Partial<ScenarioCreation>;
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.finished) {
      return true;
    }
    const dialogRef = this.dialog.open(ExitWorkflowModalComponent);
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
        // TODO: we can remove both of these conditions when the FF is removed,
        //. but it's helpful for testing different routes
        if (
          this.featureService.isFeatureEnabled('SCENARIO_DRAFTS') &&
          this.scenarioStatus === 'DRAFT'
        ) {
          return this.savePatch(data).pipe(catchError(() => of(false)));
        }

        return of(true);
      }),
      catchError(() => of(false))
    );
  }

  savePatch(data: Partial<ScenarioDraftPayload>): Observable<boolean> {
    this.newScenarioState.setLoading(true);
    const thresholdsIdMap = new Map<string, number>();
    thresholdsIdMap.set('slope', this.newScenarioState.getSlopeId());
    thresholdsIdMap.set(
      'distance_to_roads',
      this.newScenarioState.getDistanceToRoadsId()
    );
    const payload = convertFormOutputToDraftPayload(data, thresholdsIdMap);

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
    // TODO: we can remove both of these conditions when the FF is removed,
    //. but it's helpful for testing different routes
    if (
      this.featureService.isFeatureEnabled('SCENARIO_DRAFTS') &&
      this.scenarioStatus === 'DRAFT'
    ) {
      this.showRunScenarioConfirmation();
    } else {
      this.finishFromFullConfig();
    }
  }

  showRunScenarioConfirmation() {
    this.dialog
      .open(RunScenarioModalComponent)
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
          this.finished = true; // ensure we don't get an alert when we navigate away
          // TODO this should redirect or show a confirmation, but currently is not working as expected.
          if (result.id) {
            this.scenarioState.setScenarioId(result.id);
            this.scenarioState.reloadScenario();
          }
          this.router.navigate([
            'plan',
            result.planning_area,
            'scenario',
            result.id,
          ]);
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

  async finishFromFullConfig() {
    const payload = getScenarioCreationPayloadScenarioCreation({
      ...this.config,
      name: this.form.getRawValue().scenarioName || '',
      planning_area: this.planId,
    });
    this.newScenarioState.setLoading(true);
    // Firing scenario name validation before finish
    const validated = await this.refreshScenarioNameValidator();

    if (validated && this.form.valid) {
      this.scenarioService
        .createScenarioFromSteps(payload)
        .pipe(
          finalize(() => {
            this.newScenarioState.setLoading(false);
          })
        )
        .subscribe({
          next: (result) => {
            this.finished = true;
            this.router.navigate([result.id], { relativeTo: this.route });
          },
          error: () => {
            this.dialog.open(ScenarioErrorModalComponent);
          },
          complete: () => {
            this.newScenarioState.setLoading(false);
          },
        });
    } else {
      this.newScenarioState.setLoading(false);
    }
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
  async refreshScenarioNameValidator(): Promise<boolean> {
    try {
      const scenarios = await firstValueFrom(
        this.scenarioService.getScenariosForPlan(this.planId)
      );

      const names = scenarios.map((s) => s.name);
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

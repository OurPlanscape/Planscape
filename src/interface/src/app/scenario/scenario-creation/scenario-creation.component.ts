import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepComponent, StepsComponent } from '@styleguide';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  firstValueFrom,
  map,
  Observable,
  of,
  skip,
  take,
  catchError,
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
  ScenarioDraftPayload,
  ScenarioCreation,
  Constraint,
  ScenarioDraftConfig,
} from '@types';
import { GoalOverlayService } from '../../plan/goal-overlay/goal-overlay.service';
import { Step1Component } from '../step1/step1.component';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { ExitWorkflowModalComponent } from '../exit-workflow-modal/exit-workflow-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { Step2Component } from '../step2/step2.component';
import { Step4LegacyComponent } from '../step4-legacy/step4-legacy.component';
import { PlanState } from 'src/app/plan/plan.state';
import { Step3Component } from '../step3/step3.component';
import { getScenarioCreationPayloadScenarioCreation } from '../scenario-helper';
import { ScenarioErrorModalComponent } from '../scenario-error-modal/scenario-error-modal.component';
import { NewScenarioState } from '../new-scenario.state';
import { FeatureService } from 'src/app/features/feature.service';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from 'src/app/plan/plan-helpers';
import { FeaturesModule } from 'src/app/features/features.module';
import { TreatmentTargetComponent } from '../treatment-target/treatment-target.component';

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
  implements OnInit, CanComponentDeactivate {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  config: Partial<ScenarioCreation> = {};
  draftConfig: Partial<ScenarioDraftPayload> = {};

  planId = this.route.snapshot.data['planId'];
  scenarioId = this.route.snapshot.data['scenarioId'];

  plan$ = this.planState.currentPlan$;
  acres$ = this.plan$.pipe(map((plan) => (plan ? plan.area_acres : 0)));
  finished = false;

  form = new FormGroup({
    scenarioName: new FormControl('', [Validators.required]),
  });

  awaitingBackendResponse = false;

  isDynamicMapEnabled = this.featureService.isFeatureEnabled(
    'DYNAMIC_SCENARIO_MAP'
  );

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
    private planState: PlanState,
    private goalOverlayService: GoalOverlayService,
    private dialog: MatDialog,
    private router: Router,
    private featureService: FeatureService,
    private breadcrumbService: BreadcrumbService
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

  convertFormOutputToDraftPayload(
    formData: Partial<ScenarioCreation>
  ): Partial<ScenarioDraftPayload> {
    const payload: Partial<ScenarioDraftPayload> = {};
    const config: Partial<ScenarioDraftConfig> = {};
    if (
      formData.treatment_goal !== undefined
    ) {
      payload.treatment_goal = formData.treatment_goal;
    }
    if (formData.stand_size !== undefined)
    {
      config.stand_size = formData.stand_size;
    }
    if (
      formData.excluded_areas !== undefined &&
      formData.excluded_areas?.length > 0
    ) {
      config.excluded_areas = Array.from(formData.excluded_areas);
    }
    // targets
    const targets: any = {};
    if (formData.estimated_cost !== undefined) {
      targets.estimated_cost = formData.estimated_cost;
    }
    if (formData.max_area !== undefined) {
      targets.max_area = formData.max_area;
    }
    if (formData.max_budget !== undefined) {
      targets.max_budget = formData.max_budget;
    }
    if (formData.max_project_count !== undefined) {
      targets.max_project_count = formData.max_project_count
    }
    if (Object.keys(targets).length > 0) {
      config.targets = targets;
    }
    // Constraints
    const constraints: Constraint[] = [];
    if (
      formData.min_distance_from_road &&
      this.newScenarioState.getDistanceToRoadsId()
    ) {
      constraints.push({
        datalayer: this.newScenarioState.getDistanceToRoadsId(),
        operator: 'lte',
        value: formData.min_distance_from_road,
      });
    }
    if (formData.max_slope && this.newScenarioState.getSlopeId()) {
      constraints.push({
        datalayer: this.newScenarioState.getSlopeId(),
        operator: 'lt',
        value: formData.max_slope,
      });
    }
    if (constraints.length > 0) {
      config.constraints = constraints;
    }
    payload.configuration = config;
    return payload;

  }

  saveStep(data: Partial<ScenarioCreation>) {
    console.log('savingstep?:', data);
    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      const payload = this.convertFormOutputToDraftPayload(data);
      console.log('here is the payload we are sending', payload);
      return this.savePatch(payload);
    } else {
      // if dynamic map is not able just go forward.
      // remove this once dynamic map enabled.
      if (!this.isDynamicMapEnabled) {
        this.config = { ...this.config, ...data };
        this.newScenarioState.setScenarioConfig(this.config);
        return of(true);
      }

      return this.newScenarioState.isValidToGoNext$.pipe(
        take(1),
        map((valid) => {
          if (valid) {
            this.config = { ...this.config, ...data };
            this.newScenarioState.setScenarioConfig(this.config);
          } else {
            this.dialog.open(ScenarioErrorModalComponent, {
              data: {
                title: 'Invalid Scenario Configuration',
                message:
                  'Scenario must have Potential Treatable Area in order to move forward with planning. Update your selections to allow for available stands',
              },
            });
          }
          return valid;
        })
      );
    }
  }

  savePatch(data: Partial<ScenarioDraftPayload>): Observable<boolean> {
    this.newScenarioState.setScenarioConfig(this.config);

    return this.scenarioService
      .patchScenarioConfig(this.scenarioId, data)
      .pipe(
        map((result) => {
          if (result) {
            return true; // Return true if the patch was successful
          }
          return false; // Return false if the result is not as expected
        }),
        catchError((e) => {
          console.error('Patch error:', e);
          return of(false); // Return false in case of an error
        })
      );
  }

  async onFinish() {
    if (this.featureService.isFeatureEnabled('SCENARIO_DRAFTS')) {
      this.runScenario();
    } else {
      this.finishFromFullConfig();
    }
  }

  async runScenario() {
    this.awaitingBackendResponse = true;
    this.scenarioService.runScenario(this.scenarioId).subscribe({
      next: (result) => {
        this.finished = true; // ensure we don't get an alert when we navigate away
        this.router.navigate([
          'plan',
          result.planning_area,
          'scenario',
          result.id,
        ]);
      },
      error: (e) => {
        this.dialog.open(ScenarioErrorModalComponent);
        this.awaitingBackendResponse = false;
      },
      complete: () => {
        this.awaitingBackendResponse = false;
      },
    });
  }

  async finishFromFullConfig() {
    const payload = getScenarioCreationPayloadScenarioCreation({
      ...this.config,
      name: this.form.getRawValue().scenarioName || '',
      planning_area: this.planId,
    });
    this.awaitingBackendResponse = true;
    // Firing scenario name validation before finish
    const validated = await this.refreshScenarioNameValidator();

    if (validated && this.form.valid) {
      this.scenarioService.createScenarioFromSteps(payload).subscribe({
        next: (result) => {
          this.finished = true;
          this.router.navigate([result.id], { relativeTo: this.route });
        },
        error: () => {
          this.dialog.open(ScenarioErrorModalComponent);
        },
        complete: () => {
          this.awaitingBackendResponse = false;
        },
      });
    } else {
      this.awaitingBackendResponse = false;
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

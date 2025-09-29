import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepsComponent } from '@styleguide';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { firstValueFrom, map, Observable, skip, take } from 'rxjs';
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
import { ScenarioCreation } from '@types';
import { GoalOverlayService } from '../../plan/goal-overlay/goal-overlay.service';
import { Step1Component } from '../step1/step1.component';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { ExitWorkflowModalComponent } from '../exit-workflow-modal/exit-workflow-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { StepComponent } from '../../../styleguide/steps/step.component';
import { Step2Component } from '../step2/step2.component';
import { Step4Component } from '../step4/step4.component';
import { PlanState } from 'src/app/plan/plan.state';
import { Step3Component } from '../step3/step3.component';
import { getScenarioCreationPayloadScenarioCreation } from '../scenario-helper';
import { SavingErrorModalComponent } from '../saving-error-modal/saving-error-modal.component';
import { NewScenarioState } from '../new-scenario.state';
import { FeatureService } from 'src/app/features/feature.service';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { getPlanPath } from 'src/app/plan/plan-helpers';

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
    Step4Component,
    BaseLayersComponent,
    JsonPipe,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent
  implements OnInit, CanComponentDeactivate
{
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  config: Partial<ScenarioCreation> = {};

  planId = this.route.snapshot.data['planId'];
  plan$ = this.planState.currentPlan$;
  acres$ = this.plan$.pipe(map((plan) => (plan ? plan.area_acres : 0)));
  finished = false;

  form = new FormGroup({
    scenarioName: new FormControl('', [Validators.required]),
  });

  creatingScenario = false;

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
    // Adding scenario name validator
    this.refreshScenarioNameValidator();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.finished) {
      return true;
    }
    const dialogRef = this.dialog.open(ExitWorkflowModalComponent);
    return dialogRef.afterClosed();
  }

  saveStep(data: Partial<ScenarioCreation>) {
    console.log('this triggers');
    return this.newScenarioState.isValidToGoNext$.pipe(
      take(1),
      map((valid) => {
        console.log('but this doesnt');
        if (valid) {
          this.config = { ...this.config, ...data };
          this.newScenarioState.setScenarioConfig(this.config);
        } else {
          console.log('caramba jefe no');
        }
        return valid;
      })
    );
  }

  async onFinish() {
    const payload = getScenarioCreationPayloadScenarioCreation({
      ...this.config,
      name: this.form.getRawValue().scenarioName || '',
      planning_area: this.planId,
    });
    this.creatingScenario = true;
    // Firing scenario name validation before finish
    const validated = await this.refreshScenarioNameValidator();

    if (validated && this.form.valid) {
      this.scenarioService.createScenarioFromSteps(payload).subscribe({
        next: (result) => {
          this.finished = true;
          this.router.navigate([result.id], { relativeTo: this.route });
        },
        error: () => {
          this.dialog.open(SavingErrorModalComponent);
        },
        complete: () => {
          this.creatingScenario = false;
        },
      });
    } else {
      this.creatingScenario = false;
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
      this.dialog.open(SavingErrorModalComponent);
      return false;
    }
  }
}
